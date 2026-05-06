/**
 * Minimal JSON Patch (RFC 6902) applier for the Raycast view snapshot.
 * Mutates `target` in place for efficiency — callers must deep-clone first
 * if the original must remain intact.
 */

export type JsonPatchOp =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown };

function unescapePointer(s: string): string {
  return s.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parsePath(path: string): string[] {
  if (path === '') return [];
  if (!path.startsWith('/')) throw new Error(`Invalid JSON Patch path: ${path}`);
  return path.slice(1).split('/')
    .map(unescapePointer);
}

function navigateTo(obj: unknown, segments: string[]): unknown {
  let cur = obj;
  for (const seg of segments) {
    if (Array.isArray(cur)) {
      cur = cur[Number(seg)];
    } else {
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return cur;
}

export function applyJsonPatch(target: unknown, ops: JsonPatchOp[]): unknown {
  let result = target;
  for (const op of ops) {
    const segs = parsePath(op.path);

    if (segs.length === 0) {
      if (op.op === 'replace' || op.op === 'add') {
        result = op.value;
      }
      continue;
    }

    const parentSegs = segs.slice(0, -1);
    const lastSeg = segs[segs.length - 1]!;
    const parent = navigateTo(result, parentSegs);

    if (Array.isArray(parent)) {
      const idx = lastSeg === '-' ? parent.length : Number(lastSeg);
      switch (op.op) {
        case 'add':
          parent.splice(idx, 0, op.value);
          break;
        case 'remove':
          parent.splice(idx, 1);
          break;
        case 'replace':
          parent[idx] = op.value;
          break;
      }
    } else {
      const obj = parent as Record<string, unknown>;
      switch (op.op) {
        case 'add':
        case 'replace':
          obj[lastSeg] = op.value;
          break;
        case 'remove':
          delete obj[lastSeg];
          break;
      }
    }
  }
  return result;
}
