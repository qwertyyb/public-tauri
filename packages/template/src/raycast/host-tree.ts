/**
 * 遍历 Worker 下发的 {@link SerializedHostNode}，供视图壳与 ActionBar 使用。
 */
import type {
  RaycastListFiltering,
  RaycastListPaginationSerialized,
  SerializedHostActionNode,
  SerializedHostElementNode,
  SerializedHostEmptyNode,
  SerializedHostListItemNode,
  SerializedHostNode,
} from './types';

/** 文本节点无 `children`；与 `type === 'text'` 联合判别，避免 `type: string` 宿主节点无法收窄 */
export function isSerializedElement(n: SerializedHostNode): n is SerializedHostElementNode {
  return 'children' in n;
}

export function findListRoot(root: SerializedHostNode): SerializedHostNode | undefined {
  if (root.type === 'raycast:list') return root;
  if (!isSerializedElement(root)) return undefined;
  for (const ch of root.children) {
    const hit = findListRoot(ch);
    if (hit) return hit;
  }
  return undefined;
}

export function listItems(list: SerializedHostNode): SerializedHostListItemNode[] {
  if (!isSerializedElement(list)) return [];
  return list.children.filter((c): c is SerializedHostListItemNode => c.type === 'raycast:list-item');
}

/** Raycast `List.EmptyView` → 宿主 `raycast:empty`，仅在无列表项时由视图展示 */
export function listEmptyViewChild(list: SerializedHostNode): SerializedHostEmptyNode | undefined {
  if (!isSerializedElement(list) || list.type !== 'raycast:list') return undefined;
  const n = list.children.find(c => c.type === 'raycast:empty');
  return n !== undefined && isSerializedElement(n) && n.type === 'raycast:empty'
    ? (n as SerializedHostEmptyNode)
    : undefined;
}

function readListFiltering(raw: unknown): RaycastListFiltering | undefined {
  if (raw === true || raw === false) return raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (o.keepSectionOrder === true) return { keepSectionOrder: true };
    return {};
  }
  return undefined;
}

function readListPagination(raw: unknown): RaycastListPaginationSerialized | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (o.hasMore === undefined && o.pageSize === undefined) return undefined;
  const hasMore = o.hasMore === true;
  const ps = o.pageSize;
  const pageSize = typeof ps === 'number' && Number.isFinite(ps) ? ps : 0;
  return { hasMore, pageSize };
}

function readSerializedChildProp(raw: unknown): SerializedHostNode | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  if (!('hostId' in raw) || !('type' in raw)) return undefined;
  return raw as SerializedHostNode;
}

/** 与 Raycast List 可对齐、且通常落在 `raycast:list` props / JSON 快照里的字段 */
export type RaycastListSerializedChrome = {
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  searchTextFromProps?: string;
  selectedItemIdFromProps?: string;
  isLoading: boolean;
  isShowingDetail: boolean;
  filtering?: RaycastListFiltering;
  throttle?: boolean;
  pagination?: RaycastListPaginationSerialized;
  /** List.actions（无列表项时的面板）；序列化子树 */
  actions?: SerializedHostNode;
};

/** @see https://developers.raycast.com/api-reference/user-interface/list */
export function raycastListChromeFromSerializedNode(list: SerializedHostNode): RaycastListSerializedChrome {
  if (!isSerializedElement(list) || list.type !== 'raycast:list') {
    return { isLoading: false, isShowingDetail: true };
  }
  const p = list.props;
  return {
    navigationTitle: typeof p.navigationTitle === 'string' ? p.navigationTitle : undefined,
    searchBarPlaceholder: typeof p.searchBarPlaceholder === 'string' ? p.searchBarPlaceholder : undefined,
    searchTextFromProps: typeof p.searchText === 'string' ? p.searchText : undefined,
    selectedItemIdFromProps: typeof p.selectedItemId === 'string' ? p.selectedItemId : undefined,
    isLoading: p.isLoading === true,
    isShowingDetail: !!p.isShowingDetail,
    filtering: readListFiltering(p.filtering),
    throttle: p.throttle === true,
    pagination: readListPagination(p.pagination),
    actions: readSerializedChildProp(p.actions),
  };
}

export function itemBusinessId(item: SerializedHostNode): string {
  if (!isSerializedElement(item)) {
    return String((item as { hostId?: string }).hostId ?? '');
  }
  return String(item.props.id ?? item.props.title ?? item.hostId);
}

export function collectRaycastActions(root: SerializedHostNode | undefined): SerializedHostNode[] {
  if (!root || !isSerializedElement(root)) return [];
  const acc: SerializedHostNode[] = [];
  if (root.type === 'raycast:action') acc.push(root);
  for (const ch of root.children) acc.push(...collectRaycastActions(ch));
  const actionsSlot = root.props.actions as SerializedHostNode | undefined;
  if (actionsSlot && typeof actionsSlot === 'object' && 'hostId' in actionsSlot) {
    acc.push(...collectRaycastActions(actionsSlot));
  }
  const detailSlot = root.props.detail as SerializedHostNode | undefined;
  if (detailSlot && typeof detailSlot === 'object' && 'hostId' in detailSlot) {
    acc.push(...collectRaycastActions(detailSlot));
  }
  return acc;
}

/** 当前列表项在 ActionBar 中展示的 Action（props.actions slot + 子树内嵌 panel） */
export function itemActionsForBar(item: SerializedHostNode): SerializedHostActionNode[] {
  if (item.type !== 'raycast:list-item') return [];
  const fromProps = item.props.actions ? collectRaycastActions(item.props.actions as SerializedHostNode) : [];
  const fromChildren = item.children.flatMap(ch => collectRaycastActions(ch));
  const map = new Map<string, SerializedHostActionNode>();
  for (const a of [...fromProps, ...fromChildren]) {
    if (a.type === 'raycast:action') map.set(a.hostId, a as SerializedHostActionNode);
  }
  return [...map.values()];
}

export function itemDetailSlot(item: SerializedHostNode): SerializedHostNode | undefined {
  if (item.type !== 'raycast:list-item') return undefined;
  const fromProps = item.props.detail as SerializedHostNode | undefined;
  if (fromProps && fromProps.type !== 'text') return fromProps;
  for (const ch of item.children) {
    if (ch.type === 'raycast:detail') return ch;
  }
  return undefined;
}

export type DetailPaneModel =
  | { kind: 'detail'; markdown: string }
  | { kind: 'empty'; title?: string; description?: string };

export function detailPaneFromSlot(detail: SerializedHostNode | undefined): DetailPaneModel | undefined {
  if (!detail || !isSerializedElement(detail)) return undefined;
  if (detail.type === 'raycast:detail') {
    return { kind: 'detail', markdown: String(detail.props.markdown ?? '') };
  }
  if (detail.type === 'raycast:empty') {
    return {
      kind: 'empty',
      title: detail.props.title as string | undefined,
      description: detail.props.description as string | undefined,
    };
  }
  return undefined;
}

export function iconPropToDisplay(icon: unknown): string | undefined {
  if (icon == null) return undefined;
  if (typeof icon === 'string') return icon.trim();
  if (typeof icon === 'object' && icon !== null && 'source' in icon) {
    return String((icon as { source: unknown }).source).trim();
  }
  return undefined;
}

export function actionDisplayTitle(node: SerializedHostActionNode): string {
  return String(node.props.title ?? node.props.name ?? 'Action');
}
