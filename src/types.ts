import * as vscode from 'vscode';

export interface FlowNode {
  id: string;
  dependsOn: string[];
  parameterKeys: string[];
  description?: string;
  line?: number;
  declaredHere: boolean;
  /** Declaring class simple name when known (inheritance chain) */
  declaringClass?: string;
  /** Absolute path to the .java file containing this method (when known) */
  sourceFilePath?: string;
  /** `super.foo(`-style invocations detected in the method body (heuristic). */
  superCalls?: string[];
}

export interface SerializedFlow {
  nodes: FlowNode[];
  order: string[];
  layers: string[][];
  parallelLayerIndexes: number[];
  cyclic: boolean;
}

export interface ParsedTestMethod {
  name: string;
  line: number;
  dependsOn: string[];
  parameterKeys: string[];
  description?: string;
  /** Simple class name where this @Test is declared (after merge with superclasses) */
  declaringClass?: string;
  /** True when the method body lives in the file the user opened */
  declaredInPrimaryFile?: boolean;
  /** Absolute path to the .java file containing this @Test (for navigation) */
  sourceFilePath?: string;
  /**
  * Method names invoked via `super.name(` between this method and the next `@Test` in the file.
  * Heuristic regex scan (not a full Java parser); may miss calls inside comments/strings.
  */
  superCalls?: string[];
}

/**
 * File interface for the custom file selector
 * @param path - The path to the file
 * @param label - The label to display for the file
 */
export interface CustomFileInterface {
  path: string;
  label: string;
}

export type JavaCommentMode = 'code' | 'line' | 'block' | 'string' | 'char';

export enum JavaCommentMode_Enum {
  CODE = 'code',
  LINE = 'line',
  BLOCK = 'block',
  STRING = 'string',
  CHAR = 'char'
}


export interface InheritanceFile {
  uri: vscode.Uri;
  /** Simple class name of this compilation unit */
  className: string;
  /** Fully qualified name best-effort */
  fqn: string;
  source: string;
}