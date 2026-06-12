import * as vscode from 'vscode';

export class JavaContextParser {

  private static readonly CLASS_NAME_REGEX = /\bclass\s+(\w+)\b/;
  private static readonly PACKAGE_REGEX = /^\s*package\s+([\w.]+)\s*;/m;
  private static readonly IMPORT_REGEX = /^\s*import\s+(?!static)([\w.]+);/gm;

  private _fileUri: vscode.Uri;
  private _fileData?: Uint8Array;
  private _unicodeFileData : string | undefined;

  constructor(uri: vscode.Uri){
    this._fileUri =  uri;
    void this._loadFileData().then(() => {
      this._unicodeFileData = new TextDecoder('utf8').decode(this._fileData);
    });
  }
  
  private async _loadFileData(): Promise<void> {
    this._fileData = await vscode.workspace.fs.readFile(this._fileUri);
  }
  
  public parseDeclaredClassName(): string | undefined {
    const classNameMatch: RegExpMatchArray | null = this._unicodeFileData?.match(JavaContextParser.CLASS_NAME_REGEX) || null;
    return classNameMatch?.[1];
  }
  
  public parsePackageDeclaration(): string | undefined {
    const packageMatch: RegExpMatchArray | null = this._unicodeFileData?.match(JavaContextParser.PACKAGE_REGEX) || null;
    return packageMatch?.[1];
  }
  
  public parseImportMap(): Map<string, string> {
    const map = new Map<string, string>();
    const regexPattern = JavaContextParser.IMPORT_REGEX;
    let match: RegExpExecArray | null;
    while ((match = regexPattern.exec(this._unicodeFileData || '')) !== null) {
      const imp = match[1];
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

  public getFileData(): string {
    return this._unicodeFileData || '';
  }
}