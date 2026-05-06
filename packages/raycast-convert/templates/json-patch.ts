/**
 * Minimal JSON Patch (RFC 6902) diff generator.
 *
 * Tailored for the Raycast view snapshot tree:
 * - Objects with a `hostId` field in arrays are matched by `hostId` for stable diffing.
 * - Arrays without `hostId` items are compared index-by-index.
 */

export type JsonPatchOp =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown };

function escapePointer(s: string | number): string {
  return String(s).replace(/~/g, '~0')
    .replace(/\//g, '~1');
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function hasHostId(v: unknown): v is { hostId: string;[k: string]: unknown } {
  return isObject(v) && typeof v.hostId === 'string';
}

function diffValue(oldVal: unknown, newVal: unknown, path: string, ops: JsonPatchOp[]): void {
  if (oldVal === newVal) return;

  if (oldVal === null || oldVal === undefined || newVal === null || newVal === undefined) {
    if (oldVal !== newVal) ops.push({ op: 'replace', path, value: newVal });
    return;
  }

  if (typeof oldVal !== typeof newVal) {
    ops.push({ op: 'replace', path, value: newVal });
    return;
  }

  if (typeof oldVal !== 'object') {
    if (oldVal !== newVal) ops.push({ op: 'replace', path, value: newVal });
    return;
  }

  const isOldArr = Array.isArray(oldVal);
  const isNewArr = Array.isArray(newVal);
  if (isOldArr !== isNewArr) {
    ops.push({ op: 'replace', path, value: newVal });
    return;
  }

  if (isOldArr && isNewArr) {
    diffArray(oldVal as unknown[], newVal as unknown[], path, ops);
    return;
  }

  diffObject(
    oldVal as Record<string, unknown>,
    newVal as Record<string, unknown>,
    path,
    ops,
  );
}

/**
 * Diff two arrays. If both contain objects with `hostId`, use hostId-based
 * matching so that insertions/deletions don't cause cascading replace ops on
 * every subsequent element.
 */
function diffArray(oldArr: unknown[], newArr: unknown[], path: string, ops: JsonPatchOp[]): void {
  const allOldHostId = oldArr.length > 0 && oldArr.every(hasHostId);
  const allNewHostId = newArr.length > 0 && newArr.every(hasHostId);

  if (allOldHostId && allNewHostId) {
    diffHostIdArray(oldArr as { hostId: string;[k: string]: unknown }[], newArr as { hostId: string;[k: string]: unknown }[], path, ops);
    return;
  }

  diffIndexArray(oldArr, newArr, path, ops);
}

function diffIndexArray(oldArr: unknown[], newArr: unknown[], path: string, ops: JsonPatchOp[]): void {
  const minLen = Math.min(oldArr.length, newArr.length);
  for (let i = 0; i < minLen; i++) {
    diffValue(oldArr[i], newArr[i], `${path}/${i}`, ops);
  }
  for (let i = minLen; i < newArr.length; i++) {
    ops.push({ op: 'add', path: `${path}/-`, value: newArr[i] });
  }
  for (let i = oldArr.length - 1; i >= newArr.length; i--) {
    ops.push({ op: 'remove', path: `${path}/${i}` });
  }
}

/**
 * Diff arrays whose elements each have a `hostId`.
 * Match by hostId so re-ordering or insertions produce minimal patches.
 * If the order of shared hostIds diverges, fall back to a wholesale replace.
 */
function diffHostIdArray(
  oldArr: { hostId: string;[k: string]: unknown }[],
  newArr: { hostId: string;[k: string]: unknown }[],
  path: string,
  ops: JsonPatchOp[],
): void {
  const oldMap = new Map(oldArr.map((item, i) => [item.hostId, { item, index: i }]));
  const newMap = new Map(newArr.map((item, i) => [item.hostId, { item, index: i }]));

  const sharedOldOrder = oldArr.filter(o => newMap.has(o.hostId)).map(o => o.hostId);
  const sharedNewOrder = newArr.filter(n => oldMap.has(n.hostId)).map(n => n.hostId);

  const orderChanged =    sharedOldOrder.length !== sharedNewOrder.length
    || sharedOldOrder.some((id, i) => id !== sharedNewOrder[i]);

  if (orderChanged) {
    ops.push({ op: 'replace', path, value: newArr });
    return;
  }

  const removedIds = oldArr.filter(o => !newMap.has(o.hostId)).map(o => o.hostId);
  for (let i = oldArr.length - 1; i >= 0; i--) {
    if (removedIds.includes(oldArr[i].hostId)) {
      ops.push({ op: 'remove', path: `${path}/${i}` });
    }
  }

  const kept = oldArr.filter(o => newMap.has(o.hostId));
  for (const oldItem of kept) {
    const newEntry = newMap.get(oldItem.hostId)!;
    diffValue(oldItem, newEntry.item, `${path}/${newEntry.index}`, ops);
  }

  const addedEntries = newArr
    .map((item, i) => ({ item, index: i }))
    .filter(e => !oldMap.has(e.item.hostId));
  for (const entry of addedEntries) {
    ops.push({ op: 'add', path: `${path}/${entry.index}`, value: entry.item });
  }
}

function diffObject(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  path: string,
  ops: JsonPatchOp[],
): void {
  for (const key of Object.keys(oldObj)) {
    if (!(key in newObj)) {
      ops.push({ op: 'remove', path: `${path}/${escapePointer(key)}` });
    }
  }
  for (const key of Object.keys(newObj)) {
    const p = `${path}/${escapePointer(key)}`;
    if (!(key in oldObj)) {
      ops.push({ op: 'add', path: p, value: newObj[key] });
    } else {
      diffValue(oldObj[key], newObj[key], p, ops);
    }
  }
}

export function generateJsonPatch(oldVal: unknown, newVal: unknown): JsonPatchOp[] {
  const ops: JsonPatchOp[] = [];
  diffValue(oldVal, newVal, '', ops);
  return ops;
}
