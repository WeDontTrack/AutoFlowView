import * as vscode from 'vscode';
import * as path from 'path';
import { getFileData } from '../utils/fileUtils';
import { getFlowAppearanceVars } from '../appearance';
import { getPreviewHtml } from '../webview/previewHtml';
import { SerializedFlow, CustomFileInterface } from '../types';
import { loadSuperclassChain, parseDeclaredClassName } from '../parser/javaInheritance';
import { buildFlowGraph, computeParallelLayers, mergePrimaryWithSuperclassTests, parseTestNgJavaSource, topologicalOrderForFlow } from '../parser/javaTestNgParser';
import { JavaContextParser } from '../parser/java/javaContextParser';
import { TestNGContextParser } from '../parser/testng/testNGContextParser';

export class AutoFlowViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType: string = 'autoFlowView.preview';
  
  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private _files: CustomFileInterface[] = [];
  private _flows: Record<string, SerializedFlow> = {};
  private _selectedPath: string = '';
  /** URIs from the last successful load (used by Refresh). */
  private _lastUris: vscode.Uri[] = [];
  
  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }
  
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    webviewView.webview.html = getPreviewHtml();
    webviewView.onDidDispose(() => {
      if (this._view === webviewView) {
        this._view = undefined;
      }
    });
    webviewView.webview.onDidReceiveMessage(msg => {
      if (msg.type === 'selectFile' && typeof msg.path === 'string') {
        this._selectedPath = flowPathKey(msg.path);
        this.postUpdate();
      }
      if (msg.type === 'ready') {
        this.postUpdate();
      }
      if (msg.type === 'openMethod' && typeof msg.methodId === 'string') {
        void this.navigateToMethodFromPreview(msg.methodId);
      }
      if (msg.type === 'refresh') {
        void this.reloadLastFlows();
      }
    });
  }
  
  /** Re-run analysis for the same URIs (e.g. after disk edits). */
  private async reloadLastFlows(): Promise<void> {
    if (this._lastUris.length === 0) {
      void vscode.window.showInformationMessage(
        'Auto Flow View: nothing to refresh. Open a diagram from a Java file or folder first.'
      );
      return;
    }
    await this.loadUris(this._lastUris);
  }
  
  async loadUris(uris: vscode.Uri[]): Promise<void> {
    this._lastUris = [...uris];
    // Build into locals first: clearing _flows/_files before awaits lets any concurrent postUpdate()
    // (webview ready, settings change) broadcast empty flows while selectedPath still points at the old file.
    const nextFiles: CustomFileInterface[] = [];
    const nextFlows: Record<string, SerializedFlow> = {};
    for (const u of uris) {
      try {
        const flow = await buildSerializedFlow(u);
        const key = flowPathKey(u);
        nextFlows[key] = flow;
        nextFiles.push({
          path: key,
          label: fileLabel(u)
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        void vscode.window.showWarningMessage(`Auto Flow View: could not analyze ${path.basename(u.fsPath)}: ${msg}`);
      }
    }
    this._files = nextFiles;
    this._flows = nextFlows;
    if (this._files.length > 0) {
      if (!this._files.some(f => f.path === this._selectedPath)) {
        this._selectedPath = this._files[0].path;
      }
    } else {
      this._selectedPath = '';
    }
    this.postUpdate();
    // Second push helps when the sidebar webview subscribed to messages just after this call (race with visibility).
    const v = this._view;
    if (v) {
      setTimeout(() => {
        if (this._view === v) {
          this.postUpdate();
        }
      }, 250);
    }
  }
  
  private async navigateToMethodFromPreview(methodId: string): Promise<void> {
    const flow = this._flows[this._selectedPath];
    const node = flow?.nodes.find(n => n.id === methodId);
    if (!node?.sourceFilePath || node.line === undefined) {
      void vscode.window.showInformationMessage(
        `No source location for "${methodId}" (unresolved dependency or missing file in workspace).`
      );
      return;
    }
    await revealMethodDeclarationLine(node.sourceFilePath, node.line);
  }
  
  private postUpdate(): void {
    if (!this._view) {
      return;
    }
    const payload = {
      type: 'updateData' as const,
      data: {
        files: this._files,
        selectedPath: this._selectedPath,
        flows: this._flows,
        appearance: getFlowAppearanceVars()
      }
    };
    try {
      // Ensure plain JSON (structured clone can reject some values; also validates size).
      const safe = JSON.parse(JSON.stringify(payload)) as typeof payload;
      void this._view.webview.postMessage(safe);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      void vscode.window.showErrorMessage(`Auto Flow View: could not send data to the preview (${detail}).`);
    }
  }
  
  /** Re-push webview state when workspace settings (e.g. colors) change. */
  postUpdateForConfigChange(): void {
    this.postUpdate();
  }
}

async function buildSerializedFlow(uri: vscode.Uri): Promise<SerializedFlow> {
  const fileData: string = await getFileData(uri);
  const primaryClass = parseDeclaredClassName(fileData) ?? path.basename(uri.fsPath, '.java');
  const primaryParsed = parseTestNgJavaSource(fileData);
  const superclassChain = await loadSuperclassChain(uri, fileData);
  const merged = mergePrimaryWithSuperclassTests(
    primaryClass,
    primaryParsed,
    uri.fsPath,
    superclassChain.map(c => ({ className: c.className, source: c.source, filePath: c.uri.fsPath }))
  );
  const nodes = buildFlowGraph(merged);
  const { order, cyclic } = topologicalOrderForFlow(nodes);
  const { layers, parallelLayerIndexes } = computeParallelLayers(nodes);
  return { nodes, order, layers, parallelLayerIndexes, cyclic };
}

async function buildSerializedFlowv2(uri: vscode.Uri): Promise<SerializedFlow> {
  const javaContextParser = new JavaContextParser(uri);
  const testNGContextParser = new TestNGContextParser(uri);
  const primaryClass = javaContextParser.parseDeclaredClassName() ?? path.basename(uri.fsPath, '.java');
  const primaryParsed = testNGContextParser.parseTestNGJavaSource();
  const superclassChain = await loadSuperclassChain(uri, javaContextParser.getFileData());
  const merged = mergePrimaryWithSuperclassTests(
    primaryClass,
    primaryParsed,
    uri.fsPath,
    superclassChain.map(c => ({ className: c.className, source: c.source, filePath: c.uri.fsPath }))
  );
  return { nodes: [], order: [], layers: [], parallelLayerIndexes: [], cyclic: false };
}

/** Stable map key for flows / selectedPath (avoids duplicate slashes, mixed separators). */
function flowPathKey(uriOrFsPath: vscode.Uri | string): string {
  const raw = typeof uriOrFsPath === 'string' ? uriOrFsPath : uriOrFsPath.fsPath;
  return path.normalize(raw);
}

function fileLabel(uri: vscode.Uri): string {
  const rel = vscode.workspace.asRelativePath(uri, false);
  if (rel && !path.isAbsolute(rel)) {
    return rel;
  }
  return path.basename(uri.fsPath);
}


/** Open file and reveal the method declaration line with a short-lived whole-line highlight. */
async function revealMethodDeclarationLine(fsPath: string, line1Based: number): Promise<void> {
  const uri = vscode.Uri.file(fsPath);
  let doc: vscode.TextDocument;
  try {
    doc = await vscode.workspace.openTextDocument(uri);
  } catch {
    void vscode.window.showErrorMessage(`Could not open file: ${fsPath}`);
    return;
  }
  const editor = await vscode.window.showTextDocument(doc, { preview: false });
  const lineIdx = Math.max(0, Math.min(line1Based - 1, doc.lineCount - 1));
  const line = doc.lineAt(lineIdx);
  const range = line.range;
  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

  const deco = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
    isWholeLine: true
  });
  editor.setDecorations(deco, [range]);
  setTimeout(() => deco.dispose(), 3500);
}