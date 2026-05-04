/**
 * 与 Raycast 宿主类似：列表选中态主要由视图维护；snapshot.selectedItemId 作默认/回退。
 */
import type { RaycastViewSnapshot } from './types';
import { findListRoot, itemBusinessId, listItems } from './host-tree';

export function listSelectableItemIds(snapshot: RaycastViewSnapshot): string[] {
  const list = findListRoot(snapshot.root);
  if (!list) return [];
  return listItems(list).map(it => itemBusinessId(it));
}

/**
 * 若 `preferred` 仍在 `itemIds` 中则保留，否则用 Worker 默认值，再否则用首项。
 */
export function coerceSelectedIdForItemIds(
  itemIds: string[],
  preferred: string | undefined,
  workerDefault: string | undefined,
): string | undefined {
  if (itemIds.length === 0) return undefined;
  if (preferred !== undefined && itemIds.includes(preferred)) return preferred;
  if (workerDefault !== undefined && itemIds.includes(workerDefault)) return workerDefault;
  return itemIds[0];
}

/**
 * 若 `preferred` 仍在当前列表中则保留，否则用 Worker 默认值，再否则用首项。
 */
export function coerceSelectedItemId(
  snapshot: RaycastViewSnapshot,
  preferred: string | undefined,
  workerDefault: string | undefined,
): string | undefined {
  return coerceSelectedIdForItemIds(listSelectableItemIds(snapshot), preferred, workerDefault);
}
