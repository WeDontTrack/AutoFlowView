/**
 * Resolve superclass .java files from extends clause and imports (heuristic).
 */

import * as vscode from 'vscode';
import * as path from 'path';

export function parsePackageDeclaration(source: string): string | undefined {
  const m = source.match(/^\s*package\s+([\w.]+)\s*;/m);
  return m?.[1];
}

/** First `class Foo` simple name (outer type). */
export function parseDeclaredClassName(source: string): string | undefined {
  const m = source.match(/\bclass\s+(\w+)\b/);
  return m?.[1];
}

/** import simple name -> fully qualified type (no static *). */
export function parseImportMap(source: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /^\s*import\s+(?!static)([\w.]+);/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const imp = m[1];
    if (imp.endsWith('.*')) {
      continue;
    }
    const parts = imp.split('.');
    const simple = parts[parts.length - 1];
    if (simple) {
      map.set(simple, imp);
    }
  }
  return map;
}

/**
 * Immediate superclass from the compilation unit's top-level type (`Foo.java` → `class Foo extends Bar`).
 * When `compilationUnitSimpleName` is set, ignores inner classes (`class Inner extends X`).
 */
export function parseExtendsTypeName(source: string, compilationUnitSimpleName?: string): string | undefined {
  const lines = source.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) {
      continue;
    }
    const m = trimmed.match(/\bclass\s+(\w+)\s+extends\s+([\w.]+)/);
    if (!m?.[2]) {
      continue;
    }
    if (compilationUnitSimpleName && m[1] !== compilationUnitSimpleName) {
      continue;
    }
    let t = m[2].trim();
    if (t.includes('<')) {
      t = t.split('<')[0]?.trim() ?? t;
    }
    return t || undefined;
  }
  const legacy = source.match(/\bclass\s+\w+\s+extends\s+([\w.]+)/);
  if (!legacy?.[1]) {
    return undefined;
  }
  let t = legacy[1].trim();
  if (t.includes('<')) {
    t = t.split('<')[0] ?? t;
  }
  return t || undefined;
}

export function resolveTypeFqn(simpleOrFqn: string, ownPackage: string | undefined, imports: Map<string, string>): string {
  if (simpleOrFqn.includes('.')) {
    return simpleOrFqn;
  }
  const fromImp = imports.get(simpleOrFqn);
  if (fromImp) {
    return fromImp;
  }
  if (ownPackage) {
    return `${ownPackage}.${simpleOrFqn}`;
  }
  return simpleOrFqn;
}

const STOP_TYPES = new Set(['Object', 'java.lang.Object', 'Enum', 'Record']);

const JAVA_SOURCE_ROOTS = ['src/main/java', 'src/test/java', ''];

function uriForFqnUnderRoot(workspaceRoot: vscode.Uri, sourceRoot: string, fqn: string): vscode.Uri {
  const segments = fqn.split('.').filter(Boolean);
  const simple = segments.pop() ?? '';
  const base = sourceRoot ? vscode.Uri.joinPath(workspaceRoot, sourceRoot) : workspaceRoot;
  let u = base;
  for (const seg of segments) {
    u = vscode.Uri.joinPath(u, seg);
  }
  return vscode.Uri.joinPath(u, `${simple}.java`);
}

/**
 * Ascending from any `.java` file path, collect `.../src/main/java` and `.../src/test/java` dirs.
 * Covers workspace folders that point at the repo root while sources live under `module/src/main/java`.
 */
export function collectMavenStyleJavaRootsAbove(fsPath: string): vscode.Uri[] {
  const seen = new Set<string>();
  const out: vscode.Uri[] = [];
  let dir = path.dirname(fsPath);
  for (let i = 0; i < 80 && dir !== path.dirname(dir); i++) {
    const base = path.basename(dir);
    const parentPath = path.dirname(dir);
    const parentBase = path.basename(parentPath);
    const grandParentBase = path.basename(path.dirname(parentPath));
    if (base === 'java' && grandParentBase === 'src' && (parentBase === 'main' || parentBase === 'test')) {
      const norm = path.normalize(dir);
      if (!seen.has(norm)) {
        seen.add(norm);
        out.push(vscode.Uri.file(norm));
      }
    }
    dir = parentPath;
  }
  return out;
}

async function tryFqnUnderMavenRootsAdjacentToFile(fqn: string, hintUri: vscode.Uri): Promise<vscode.Uri | undefined> {
  const segments = fqn.split('.').filter(Boolean);
  const simple = segments.pop() ?? '';
  const pkgSegments = segments;

  const roots = collectMavenStyleJavaRootsAbove(hintUri.fsPath);

  for (const root of roots) {
    let u = root;
    for (const seg of pkgSegments) {
      u = vscode.Uri.joinPath(u, seg);
    }
    const candidate = vscode.Uri.joinPath(u, `${simple}.java`);
    try {
      const st = await vscode.workspace.fs.stat(candidate);
      if (st.type === vscode.FileType.File) {
        return candidate;
      }
    } catch {
      /* not found */
    }
  }
  return undefined;
}

async function tryFqnViaWorkspaceFolderRoots(fqn: string, hintUri: vscode.Uri): Promise<vscode.Uri | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return undefined;
  }
  const preferred = vscode.workspace.getWorkspaceFolder(hintUri);
  const ordered = preferred ? [preferred, ...folders.filter(f => f.uri.fsPath !== preferred.uri.fsPath)] : [...folders];

  for (const wf of ordered) {
    for (const root of JAVA_SOURCE_ROOTS) {
      const candidate = uriForFqnUnderRoot(wf.uri, root, fqn);
      try {
        const st = await vscode.workspace.fs.stat(candidate);
        if (st.type === vscode.FileType.File) {
          return candidate;
        }
      } catch {
        /* not found */
      }
    }
  }
  return undefined;
}

/**
 * Find a workspace file matching FQN path suffix .../a/b/C.java
 */
export async function findJavaFileForFqn(fqn: string): Promise<vscode.Uri | undefined> {
  if (STOP_TYPES.has(fqn)) {
    return undefined;
  }
  const relPath = fqn.replace(/\./g, '/') + '.java';
  const baseName = path.basename(relPath);
  const matches = await vscode.workspace.findFiles(`**/${baseName}`, '**/node_modules/**', 2000);
  if (matches.length === 0) {
    return undefined;
  }
  const norm = (fs: string) => fs.replace(/\\/g, '/');
  const suffix = relPath.replace(/^.*\//, '');
  for (const u of matches) {
    const n = norm(u.fsPath);
    if (n.endsWith(relPath) || n.endsWith('/' + relPath)) {
      return u;
    }
  }
  for (const u of matches) {
    if (norm(u.fsPath).endsWith('/' + suffix)) {
      const parts = fqn.split('.');
      const pkgParts = parts.slice(0, -1);
      const dirNeedle = pkgParts.join('/');
      if (dirNeedle && norm(u.fsPath).includes(dirNeedle)) {
        return u;
      }
    }
  }
  return matches[0];
}

/**
 * Resolve FQN → file URI: prefer java roots adjacent to the hint file (multi-module repos),
 * then workspace-folder `src/main/java` layouts, then workspace-wide glob (may be ambiguous).
 */
export async function resolveJavaUriForFqn(fqn: string, hintUri: vscode.Uri): Promise<vscode.Uri | undefined> {
  const adjacent = await tryFqnUnderMavenRootsAdjacentToFile(fqn, hintUri);
  if (adjacent) {
    return adjacent;
  }

  const wfLayout = await tryFqnViaWorkspaceFolderRoots(fqn, hintUri);
  if (wfLayout) {
    return wfLayout;
  }

  const fromGlob = await findJavaFileForFqn(fqn);
  if (fromGlob) {
    return fromGlob;
  }
  return undefined;
}

export interface InheritanceFile {
  uri: vscode.Uri;
  /** Simple class name of this compilation unit */
  className: string;
  /** Fully qualified name best-effort */
  fqn: string;
  source: string;
}

/**
 * Walk superclass chain: [immediateParent, ..., oldestResolved]
 */
export async function loadSuperclassChain(_startUri: vscode.Uri, startSource: string, maxDepth = 25): Promise<InheritanceFile[]> {
  const chain: InheritanceFile[] = [];
  let currentUri = _startUri;
  let currentSource = startSource;
  let nextPkg = parsePackageDeclaration(startSource);
  let nextImports = parseImportMap(startSource);

  let depth = 0;
  while (depth++ < maxDepth) {
    const unitName = path.basename(currentUri.fsPath, '.java');
    const ext = parseExtendsTypeName(currentSource, unitName);
    if (!ext) {
      break;
    }
    const parentFqn = resolveTypeFqn(ext, nextPkg, nextImports);
    if (STOP_TYPES.has(parentFqn.split('.').pop() ?? '') || parentFqn === 'java.lang.Object') {
      break;
    }

    const parentUri = await resolveJavaUriForFqn(parentFqn, currentUri);
    if (!parentUri) {
      break;
    }

    const buf = await vscode.workspace.fs.readFile(parentUri);
    const text = new TextDecoder('utf8').decode(buf);
    const parentPkg = parsePackageDeclaration(text);
    const parentClass = parseDeclaredClassName(text) ?? path.basename(parentUri.fsPath, '.java');
    const parentFqnResolved = parentPkg ? `${parentPkg}.${parentClass}` : parentClass;

    chain.push({
      uri: parentUri,
      className: parentClass,
      fqn: parentFqnResolved,
      source: text
    });

    currentUri = parentUri;
    currentSource = text;
    nextPkg = parentPkg;
    nextImports = parseImportMap(text);
  }

  return chain;
}
