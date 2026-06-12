import * as vscode from 'vscode';

import { ParsedTestMethod, JavaCommentMode_Enum } from '../../types';

export class TestNGContextParser {
  private static readonly VOID_ON_LINE = /void\s+(\w+)\s*\(/;
  private static readonly LINE_BREAK_REGEX = /\r?\n/;
  private static readonly TEST_ANNOTATION_REGEX = /@Test\b/;
  private static readonly EMPTY_LINE_REGEX = /^\s*$/;
  private static readonly PARAMETERS_ANNOTATION_REGEX = /^\s*@Parameters\b/;
  private static readonly PARAMETERS_BODY_REGEX = /@Parameters\s*\(\s*\{([\s\S]*?)\}\s*\)/;
  private static readonly DEPENDS_ON_METHODS_REGEX = /dependsOnMethods\s*=\s*\{([\s\S]*?)\}/;
  private static readonly DEPENDS_ON_METHODS_SINGLE_REGEX = /dependsOnMethods\s*=\s*"((?:[^"\\]|\\.)*)"/;
  private static readonly DESCRIPTION_REGEX = /description\s*=\s*"((?:[^"\\]|\\.)*)"/;
  private static readonly METHOD_SCOPE_REGEX = /^\s*(?:public|protected|private)\s+/;
  private static readonly TEST_ANNOTATION_REGEX_WTTH_SPACE = /^\s*@Test\b/;
  private static readonly SUPER_CALL_REGEX = /\bsuper\.(\w+)\s*\(/g;
  
  private _fileUri: vscode.Uri;
  private _fileData?: Uint8Array;
  private _unicodeFileData: string | undefined;
  private _sanitizedCodeLines: string[] = [];
  private _lineCount: number = 0;
  
  
  constructor(uri: vscode.Uri){
    this._fileUri = uri;
    void this._loadFileData().then(() => {
      this._unicodeFileData = new TextDecoder('utf8').decode(this._fileData);
      this._sanitizedCodeLines = this._stripJavaCommentsPreserveLines().split(TestNGContextParser.LINE_BREAK_REGEX);
      this._lineCount = this._sanitizedCodeLines.length;
    })
  }
  
  private async _loadFileData(): Promise<void> {
    this._fileData = await vscode.workspace.fs.readFile(this._fileUri);
  }
  
  public getFileData(): string {
    return this._unicodeFileData || '';
  }
  
  public parseTestNGJavaSource(): ParsedTestMethod[] {
    const lines: string[] = this._sanitizedCodeLines || [];
    const results: ParsedTestMethod[] = [];

    for(let i = 0; i < lines.length; i++) {
      if (!TestNGContextParser.TEST_ANNOTATION_REGEX.test(lines[i])) continue;

      const paramKeys = this._collectParametersOfTestMethod(i);
      const block = this._collectMultiLineTestAnnotation(i);
      const testBody = block.text;
      const parsedBody = this._parseTestAnnotationBody(testBody)
      const method = this._findMethodAfter(block.endIdx, block.restOnLastLine);

      if( !method ) {
        i = block.endIdx;
        continue;
      }

      results.push({
        name: method.name,
        line: method.line,
        dependsOn: parsedBody.dependsOn,
        parameterKeys: paramKeys,
        description: parsedBody.description,
        superCalls: this._extractSuperCallsUntilNextTest(method.line)
      })

      i = block.endIdx
    }
    return results;
  }


  private _extractSuperCallsUntilNextTest(methodLineBased: number): string[] {
    const start = Math.max(0, methodLineBased - 1);
    let end = this._lineCount;
    for( let i = start + 1; i < this._lineCount; i++){
      if (TestNGContextParser.TEST_ANNOTATION_REGEX_WTTH_SPACE.test(this._sanitizedCodeLines[i] ?? '')){
        end = i;
        break;
      }
    }

    const seen = new Set<string>();
    for ( let i = start; i < end; i++){
      const line = this._sanitizedCodeLines[i] ?? '';
      let matches: RegExpExecArray | null;
      while ((matches = TestNGContextParser.SUPER_CALL_REGEX.exec(line)) !== null){
        seen.add(matches[1]!)
      }
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }

  private _findMethodAfter(endIdx: number, restOnLastLine: string): { name: string; line: number } | null {
    // lines -> this._sanitizedCodeLines
    let same = this._findVoidMethodName(restOnLastLine);
    if ( same ) return { name: same, line: endIdx + 1 };

    for (let i = endIdx + 1; i < this._lineCount; i++) {
      const line = this._sanitizedCodeLines[i];
      if ( /^\s*@/.test(line)) continue;
      same = this._findVoidMethodName(line);
      if ( same ) return { name: same, line: i + 1 };

      if( TestNGContextParser.METHOD_SCOPE_REGEX.test(line) && !line.includes('void')) break;
    }

    return null;
  }

  private _findVoidMethodName(line: string): string | null {
    return line.match(TestNGContextParser.VOID_ON_LINE)?.[1] ?? null;
  }

  private _parseTestAnnotationBody(body: string): { dependsOn: string[]; description?: string } {
    const dependsOn: string[] = [];
    const arrayMatch = body.match(TestNGContextParser.DEPENDS_ON_METHODS_REGEX)
    if ( arrayMatch?.[1]) {
      const regex = /"((?:[^"\\]|\\.)*)"/g;
      let matches: RegExpExecArray | null;
      while (( matches = regex.exec(arrayMatch[1])) !== null){
        dependsOn.push(matches[1].replace(/\\"/g, '"'));
      }
    } else {
      const single = body.match(TestNGContextParser.DEPENDS_ON_METHODS_SINGLE_REGEX)
      if(single) dependsOn.push(single[1])
    }
    const description = body.match(TestNGContextParser.DESCRIPTION_REGEX)?.[1]?.replace(/\\"/g, '"');
    return { dependsOn, description };
  }

  private _collectMultiLineTestAnnotation(startIdx: number): { text: string; endIdx: number; restOnLastLine: string } {
    const firstLine = this._sanitizedCodeLines[startIdx] ?? '';
    const at = firstLine.search(TestNGContextParser.TEST_ANNOTATION_REGEX)
    if( at === -1) return { text: '', endIdx: startIdx, restOnLastLine: '' };

    const open = firstLine.indexOf('(', at);
    if (open === -1) return { text: firstLine.slice(at).trim(), endIdx: startIdx, restOnLastLine: ''}

    let depth = 0, out = '', j = startIdx;
    for (; j < this._lineCount; j++){
      const L = this._sanitizedCodeLines[j];
      const k0 = j === startIdx ? at : 0;
      for (let k = k0; k < L.length; k++) {
        const c = L[k];
        out += c;

        if ( k >= open) {
          if( c === '(') depth++;
          else if ( c === ')') {
            depth--;
            if ( depth === 0) {
              const rest = L.slice(k + 1);
              return { text: out, endIdx: j, restOnLastLine: rest };
            }
          }
        }
      }
    }
    return { text: out, endIdx: Math.min(j, this._lineCount - 1), restOnLastLine: '' }
  }

  private _collectParametersOfTestMethod(testLineIdx: number): string[] {
    const lines: string[] = this._sanitizedCodeLines || [];
    let k = testLineIdx - 1;

    while (k >= 0 && TestNGContextParser.EMPTY_LINE_REGEX.test(lines[k])) k--;

    if( k < 0 || !TestNGContextParser.PARAMETERS_ANNOTATION_REGEX.test(lines[k])) return [];
    
    const text = this._collectParametersAnnotation(k);
    return this._parseParametersBody(text);
  }

  private _parseParametersBody(text: string): string[]{
    const keys: string[] = [];
    const innerBody = text.match(TestNGContextParser.PARAMETERS_BODY_REGEX)
    
    if(!innerBody?.[1]) return keys;

    const re = /"((?:[^"\\]|\\.)*)"/g;
    let matches: RegExpExecArray | null;
    while ( (matches = re.exec(innerBody[1])) !== null){
      keys.push(matches[1].replace(/\\"/g, '"'));
    }
    return keys;
  }

  private _collectParametersAnnotation(paramLineIdx: number): string {
    const firstLine = this._sanitizedCodeLines[paramLineIdx] ?? '';
    const at = firstLine.search(TestNGContextParser.PARAMETERS_ANNOTATION_REGEX)
    if( at === -1) return '';

    const open = firstLine.indexOf('(', at);
    if ( open === -1) return firstLine.slice(at).trim();

    let depth = 0, out = '', j = paramLineIdx;

    for (; j < this._lineCount; j++){
      const L = this._sanitizedCodeLines[j];
      const k0 = j === paramLineIdx ? at : 0;
      for (let k = k0; k < L.length; k++) {
        const c = L[k];
        out += c;
        if (k >= open) {
          if (c === '(') { depth++; }
          else if (c === ')') {
            depth--;
            if (depth === 0) { return out; }
          }
        }
      }
    }
    return out;
  }
  
  private _stripJavaCommentsPreserveLines(): string {    
    let out: string = '';
    let i: number = 0;
    let mode: JavaCommentMode_Enum = JavaCommentMode_Enum.CODE;
    const source: string = this._unicodeFileData || '';
    
    while (i < source.length) {
      const c = source[i]!;
      const n = i + 1 < source.length ? source[i + 1]! : '';
  
      if (mode === JavaCommentMode_Enum.CODE) {
        if (c === '/' && n === '/') {
          out += '  ';
          i += 2;
          mode = JavaCommentMode_Enum.LINE;
          continue;
        }
        if (c === '/' && n === '*') {
          out += '  ';
          i += 2;
          mode = JavaCommentMode_Enum.BLOCK;
          continue;
        }
        if (c === '"') {
          out += c;
          i++;
          mode = JavaCommentMode_Enum.STRING;
          continue;
        }
        if (c === "'") {
          out += c;
          i++;
          mode = JavaCommentMode_Enum.CHAR;
          continue;
        }
        out += c;
        i++;
        continue;
      }
  
      if (mode === JavaCommentMode_Enum.LINE) {
        if (c === '\n') {
          out += '\n';
          i++;
          mode = JavaCommentMode_Enum.CODE;
        } else {
          out += ' ';
          i++;
        }
        continue;
      }
  
      if (mode === JavaCommentMode_Enum.BLOCK) {
        if (c === '*' && n === '/') {
          out += '  ';
          i += 2;
          mode = JavaCommentMode_Enum.CODE;
        } else if (c === '\n') {
          out += '\n';
          i++;
        } else {
          out += ' ';
          i++;
        }
        continue;
      }
  
      if (mode === JavaCommentMode_Enum.STRING) {
        out += c;
        if (c === '\\' && i + 1 < source.length) {
          out += source[i + 1]!;
          i += 2;
          continue;
        }
        i++;
        if (c === '"') {
          mode = JavaCommentMode_Enum.CODE;
        }
        continue;
      }
  
      // mode === JavaCommentMode_Enum.CHAR
      out += c;
      if (c === '\\' && i + 1 < source.length) {
        out += source[i + 1]!;
        i += 2;
        continue;
      }
      i++;
      if (c === "'") {
        mode = JavaCommentMode_Enum.CODE;
      }
    }
  
    return out;
  }
}