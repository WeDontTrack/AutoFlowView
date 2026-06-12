import * as vscode from 'vscode';

export async function collectFiles(entry: vscode.Uri, fileType: string): Promise<vscode.Uri[]> {
  const stat = await vscode.workspace.fs.stat(entry);
  if (stat.type === vscode.FileType.File) {
    if (entry.fsPath.endsWith(fileType)) {
      return [entry];
    }
    void vscode.window.showWarningMessage(`Auto Flow View: please pick a ${fileType} file or a folder.`);
    return [];
  }
  if (stat.type === vscode.FileType.Directory) {
    const allFiles: vscode.Uri[] = [];
    await _walkFilesInDir(entry, fileType, allFiles);
    if (allFiles.length === 0) {
      void vscode.window.showInformationMessage(`No ${fileType} files found under the selected folder.`);
    }
    return allFiles.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
  }
  return [];
}

async function _walkFilesInDir(dir: vscode.Uri, fileType: string, allFiles: vscode.Uri[]): Promise<void> {
  const entries = await vscode.workspace.fs.readDirectory(dir); //read files in workspace folder rather than file system - better to open workspace in vscode for performance 
  for (const [name, type] of entries) {
    const child = vscode.Uri.joinPath(dir, name);
    if (type === vscode.FileType.Directory) {
      await _walkFilesInDir(child, fileType, allFiles);
    } else if (type === vscode.FileType.File && name.endsWith(fileType)) {
      allFiles.push(child);
    }
  }
}


export async function getFileData(uri: vscode.Uri): Promise<string> {
  const fileData: Uint8Array = await vscode.workspace.fs.readFile(uri);
  const text: string = new TextDecoder('utf8').decode(fileData);
  return text;
}