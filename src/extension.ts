import * as vscode from 'vscode';
import { AutoFlowViewProvider } from './provider/AutoFlowViewProvider';
import { collectFiles } from './utils/fileUtils';

async function openDiagram(provider: AutoFlowViewProvider): Promise<void> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Select Java file or folder',
    filters: { Java: ['java'], 'All files': ['*'] }
  });
  if (!picked?.[0]) {
    return;
  }
  const javaFiles = await collectFiles(picked[0], '.java');
  await provider.loadUris(javaFiles);
  await vscode.commands.executeCommand('workbench.view.extension.autoFlowViewContainer');
}

async function openFromActiveEditor(provider: AutoFlowViewProvider): Promise<void> {
  const ed = vscode.window.activeTextEditor;
  if (!ed || ed.document.uri.scheme !== 'file' || !ed.document.uri.fsPath.endsWith('.java')) {
    void vscode.window.showWarningMessage('Open a .java file from disk in the editor first (scheme must be file).');
    return;
  }
  await provider.loadUris([ed.document.uri]);
  await vscode.commands.executeCommand('workbench.view.extension.autoFlowViewContainer');
}

function syncPreviewEnabled(): boolean {
  return vscode.workspace.getConfiguration('autoflowview').get<boolean>('syncPreviewWithActiveEditor') ?? false;
}

function registerSyncWithActiveEditor(context: vscode.ExtensionContext, provider: AutoFlowViewProvider): void {
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const run = (uri: vscode.Uri | undefined): void => {
    if (!uri || uri.scheme !== 'file' || !uri.fsPath.toLowerCase().endsWith('.java')) {
      return;
    }
    if (!syncPreviewEnabled()) {
      return;
    }
    if (debounce) {
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => {
      void provider.loadUris([uri]);
    }, 450);
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(ed => {
      run(ed?.document.uri);
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => {
      run(doc.uri);
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('autoflowview.syncPreviewWithActiveEditor')) {
        const ed = vscode.window.activeTextEditor;
        run(ed?.document.uri);
      }
    })
  );
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new AutoFlowViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('autoflowview')) {
        provider.postUpdateForConfigChange();
      }
    })
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AutoFlowViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('autoflowview.openFlowDiagram', () => openDiagram(provider))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('autoflowview.openFlowDiagramFromActiveFile', () => openFromActiveEditor(provider))
  );
  registerSyncWithActiveEditor(context, provider);
}

export function deactivate(): void {}
