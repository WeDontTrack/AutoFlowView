import { FlowNode, ParsedTestMethod } from "../types";

/**
 * Parses TestNG-style Java sources for @Test methods, dependsOnMethods, and @Parameters.
 * Heuristic-based (not a full Java parser); matches common formatting in flow test classes.
 */

const VOID_ON_LINE = /void\s+(\w+)\s*\(/;

/**
 * Remove Java comments while preserving line breaks (and near-original columns).
 * This prevents commented-out `@Test`/methods from being parsed as real flow nodes.
 */
function stripJavaCommentsPreserveLines(source: string): string {
  let out = '';
  let i = 0;
  let mode: 'code' | 'line' | 'block' | 'string' | 'char' = 'code';

  while (i < source.length) {
    const c = source[i]!;
    const n = i + 1 < source.length ? source[i + 1]! : '';

    if (mode === 'code') {
      if (c === '/' && n === '/') {
        out += '  ';
        i += 2;
        mode = 'line';
        continue;
      }
      if (c === '/' && n === '*') {
        out += '  ';
        i += 2;
        mode = 'block';
        continue;
      }
      if (c === '"') {
        out += c;
        i++;
        mode = 'string';
        continue;
      }
      if (c === "'") {
        out += c;
        i++;
        mode = 'char';
        continue;
      }
      out += c;
      i++;
      continue;
    }

    if (mode === 'line') {
      if (c === '\n') {
        out += '\n';
        i++;
        mode = 'code';
      } else {
        out += ' ';
        i++;
      }
      continue;
    }

    if (mode === 'block') {
      if (c === '*' && n === '/') {
        out += '  ';
        i += 2;
        mode = 'code';
      } else if (c === '\n') {
        out += '\n';
        i++;
      } else {
        out += ' ';
        i++;
      }
      continue;
    }

    if (mode === 'string') {
      out += c;
      if (c === '\\' && i + 1 < source.length) {
        out += source[i + 1]!;
        i += 2;
        continue;
      }
      i++;
      if (c === '"') {
        mode = 'code';
      }
      continue;
    }

    // mode === 'char'
    out += c;
    if (c === '\\' && i + 1 < source.length) {
      out += source[i + 1]!;
      i += 2;
      continue;
    }
    i++;
    if (c === "'") {
      mode = 'code';
    }
  }

  return out;
}

/**
 * Walk from @Test through balanced parens starting at first '(' after @Test.
 * Handles @Test and method signature on the same line (method parens ignored: we stop at @Test's closing ')'.
 */
function collectMultiLineTestAnnotation(lines: string[], startIdx: number): { text: string; endIdx: number; restOnLastLine: string } {
  const first = lines[startIdx] ?? '';
  const at = first.search(/@Test\b/);
  if (at === -1) {
    return { text: '', endIdx: startIdx, restOnLastLine: '' };
  }
  const open = first.indexOf('(', at);
  if (open === -1) {
    return { text: first.slice(at).trim(), endIdx: startIdx, restOnLastLine: '' };
  }

  let depth = 0;
  let out = '';
  let j = startIdx;

  for (; j < lines.length; j++) {
    const L = lines[j];
    const k0 = j === startIdx ? at : 0;
    for (let k = k0; k < L.length; k++) {
      const c = L[k];
      out += c;
      if (k >= open) {
        if (c === '(') {
          depth++;
        }
        if (c === ')') {
          depth--;
          if (depth === 0) {
            const rest = L.slice(k + 1);
            return { text: out, endIdx: j, restOnLastLine: rest };
          }
        }
      }
    }
  }
  return { text: out, endIdx: Math.min(j, lines.length - 1), restOnLastLine: '' };
}

function parseParametersBody(text: string): string[] {
  const keys: string[] = [];
  const inner = text.match(/@Parameters\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!inner?.[1]) {
    return keys;
  }
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner[1])) !== null) {
    keys.push(m[1].replace(/\\"/g, '"'));
  }
  return keys;
}

function parseTestBody(body: string): { dependsOn: string[]; description?: string } {
  const dependsOn: string[] = [];
  const arrayMatch = body.match(/dependsOnMethods\s*=\s*\{([\s\S]*?)\}/);
  if (arrayMatch?.[1]) {
    const re = /"((?:[^"\\]|\\.)*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(arrayMatch[1])) !== null) {
      dependsOn.push(m[1].replace(/\\"/g, '"'));
    }
  } else {
    const single = body.match(/dependsOnMethods\s*=\s*"((?:[^"\\]|\\.)*)"/);
    if (single) {
      dependsOn.push(single[1]);
    }
  }
  const descMatch = body.match(/description\s*=\s*"((?:[^"\\]|\\.)*)"/);
  const description = descMatch?.[1]?.replace(/\\"/g, '"');
  return { dependsOn, description };
}

function findVoidMethodName(line: string): string | null {
  const m = line.match(VOID_ON_LINE);
  return m?.[1] ?? null;
}

/**
 * Collect `super.methodName(` calls from the method line up to (but not including) the next `@Test` line.
 */
function extractSuperCallsUntilNextTest(lines: string[], methodLine1Based: number): string[] {
  const start = Math.max(0, methodLine1Based - 1);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*@Test\b/.test(lines[i] ?? '')) {
      end = i;
      break;
    }
  }
  const seen = new Set<string>();
  const re = /\bsuper\.(\w+)\s*\(/g;
  for (let i = start; i < end; i++) {
    const line = lines[i] ?? '';
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      seen.add(m[1]!);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

function findMethodAfter(lines: string[], endIdx: number, restOnLastLine: string): { name: string; line: number } | null {
  const same = findVoidMethodName(restOnLastLine);
  if (same) {
    return { name: same, line: endIdx + 1 };
  }
  for (let i = endIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*@/.test(line)) {
      continue;
    }
    const n = findVoidMethodName(line);
    if (n) {
      return { name: n, line: i + 1 };
    }
    if (/^\s*(?:public|protected|private)\s+/.test(line) && !line.includes('void')) {
      break;
    }
  }
  return null;
}

function collectParametersAnnotation(lines: string[], paramLineIdx: number): string {
  const first = lines[paramLineIdx] ?? '';
  const at = first.search(/@Parameters\b/);
  if (at === -1) {
    return '';
  }
  const open = first.indexOf('(', at);
  if (open === -1) {
    return first.slice(at).trim();
  }
  let depth = 0;
  let out = '';
  let j = paramLineIdx;
  for (; j < lines.length; j++) {
    const L = lines[j];
    const k0 = j === paramLineIdx ? at : 0;
    for (let k = k0; k < L.length; k++) {
      const c = L[k];
      out += c;
      if (k >= open) {
        if (c === '(') {
          depth++;
        }
        if (c === ')') {
          depth--;
          if (depth === 0) {
            return out;
          }
        }
      }
    }
  }
  return out;
}

function collectParametersAbove(lines: string[], testLineIdx: number): string[] {
  let k = testLineIdx - 1;
  while (k >= 0 && /^\s*$/.test(lines[k])) {
    k--;
  }
  if (k < 0 || !/^\s*@Parameters\b/.test(lines[k])) {
    return [];
  }
  const text = collectParametersAnnotation(lines, k);
  return parseParametersBody(text);
}

/**
 * Extract @Test methods in file order with dependsOn and adjacent @Parameters.
 */
export function parseTestNgJavaSource(source: string): ParsedTestMethod[] {
  const sanitized = stripJavaCommentsPreserveLines(source);
  const lines = sanitized.split(/\r?\n/);
  const results: ParsedTestMethod[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!/@Test\b/.test(lines[i])) {
      continue;
    }

    const paramKeys = collectParametersAbove(lines, i);

    const block = collectMultiLineTestAnnotation(lines, i);
    const testBody = block.text;
    const parsed = parseTestBody(testBody);
    const method = findMethodAfter(lines, block.endIdx, block.restOnLastLine);
    if (!method) {
      i = block.endIdx;
      continue;
    }

    results.push({
      name: method.name,
      line: method.line,
      dependsOn: parsed.dependsOn,
      parameterKeys: paramKeys,
      description: parsed.description,
      superCalls: extractSuperCallsUntilNextTest(lines, method.line)
    });

    i = block.endIdx;
  }

  return results;
}

/**
 * Merge superclass @Test methods (oldest ancestor first) then primary class (overrides).
 */
export function mergePrimaryWithSuperclassTests(
  primaryClassName: string,
  primaryParsed: ParsedTestMethod[],
  primaryFilePath: string,
  /** [immediate parent, …, oldest] from loadSuperclassChain */
  ancestorsNewestFirst: Array<{ className: string; source: string; filePath: string }>
): ParsedTestMethod[] {
  const byName = new Map<string, ParsedTestMethod>();
  for (const anc of [...ancestorsNewestFirst].reverse()) {
    const methods = parseTestNgJavaSource(anc.source);
    for (const m of methods) {
      byName.set(m.name, {
        ...m,
        declaringClass: anc.className,
        declaredInPrimaryFile: false,
        sourceFilePath: anc.filePath
      });
    }
  }
  for (const m of primaryParsed) {
    byName.set(m.name, {
      ...m,
      declaringClass: primaryClassName,
      declaredInPrimaryFile: true,
      sourceFilePath: primaryFilePath
    });
  }
  return [...byName.values()];
}

export function buildFlowGraph(parsed: ParsedTestMethod[]): FlowNode[] {
  const byName = new Map<string, FlowNode>();

  for (const p of parsed) {
    byName.set(p.name, {
      id: p.name,
      dependsOn: [...p.dependsOn],
      parameterKeys: [...p.parameterKeys],
      description: p.description,
      line: p.line,
      declaredHere: p.declaredInPrimaryFile !== false,
      declaringClass: p.declaringClass,
      sourceFilePath: p.sourceFilePath,
      superCalls: p.superCalls && p.superCalls.length > 0 ? [...p.superCalls] : undefined
    });
  }

  for (const p of parsed) {
    for (const dep of p.dependsOn) {
      if (!byName.has(dep)) {
        byName.set(dep, {
          id: dep,
          dependsOn: [],
          parameterKeys: [],
          declaredHere: false,
          declaringClass: undefined,
          sourceFilePath: undefined
        });
      }
    }
  }

  return [...byName.values()];
}

export function topologicalOrderForFlow(nodes: FlowNode[]): { order: string[]; cyclic: boolean } {
  const ids = new Set(nodes.map(n => n.id));
  const incoming = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of ids) {
    incoming.set(id, 0);
    adj.set(id, []);
  }

  for (const n of nodes) {
    for (const d of n.dependsOn) {
      if (!ids.has(d)) {
        continue;
      }
      adj.get(d)?.push(n.id);
      incoming.set(n.id, (incoming.get(n.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of incoming) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  queue.sort((a, b) => a.localeCompare(b));
  const order: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    const outs = [...(adj.get(u) ?? [])].sort((a, b) => a.localeCompare(b));
    for (const v of outs) {
      const next = (incoming.get(v) ?? 0) - 1;
      incoming.set(v, next);
      if (next === 0) {
        queue.push(v);
      }
    }
    queue.sort((a, b) => a.localeCompare(b));
  }

  const cyclic = order.length !== ids.size;
  if (cyclic) {
    for (const id of ids) {
      if (!order.includes(id)) {
        order.push(id);
      }
    }
  }

  return { order, cyclic };
}

/**
 * Assign each node to a layer: max(dep layer)+1. Nodes in the same layer have no dependsOn edge
 * between them — they may run in parallel if TestNG parallel execution is enabled.
 */
export function computeParallelLayers(nodes: FlowNode[]): { layers: string[][]; parallelLayerIndexes: number[] } {
  const ids = new Set(nodes.map(n => n.id));
  const deps = new Map(nodes.map(n => [n.id, n.dependsOn.filter(d => ids.has(d))] as [string, string[]]));

  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  function layerOf(id: string): number {
    if (memo.has(id)) {
      return memo.get(id)!;
    }
    if (visiting.has(id)) {
      return 0;
    }
    visiting.add(id);
    const ds = deps.get(id) ?? [];
    let L = 0;
    if (ds.length > 0) {
      let mx = 0;
      for (const d of ds) {
        mx = Math.max(mx, layerOf(d));
      }
      L = mx + 1;
    }
    visiting.delete(id);
    memo.set(id, L);
    return L;
  }

  for (const id of ids) {
    layerOf(id);
  }

  let maxL = 0;
  for (const L of memo.values()) {
    maxL = Math.max(maxL, L);
  }

  const layers: string[][] = Array.from({ length: maxL + 1 }, () => []);
  for (const id of ids) {
    const L = memo.get(id) ?? 0;
    layers[L].push(id);
  }
  for (const row of layers) {
    row.sort((a, b) => a.localeCompare(b));
  }

  const parallelLayerIndexes: number[] = [];
  layers.forEach((row, i) => {
    if (row.length > 1) {
      parallelLayerIndexes.push(i);
    }
  });

  return { layers, parallelLayerIndexes };
}
