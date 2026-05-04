/**
 * 把 Worker 快照里的 `raycast:list` 节点 + {@link RaycastViewSnapshot} 展开为浏览器侧 props，
 * 字段集合对齐 {@link https://developers.raycast.com/api-reference/user-interface/list Raycast List}（在 Public 视图可实现 / 可序列化的范围内）。
 */
import type {
  RaycastListFiltering,
  RaycastListPaginationSerialized,
  RaycastViewSnapshot,
  SerializedHostEmptyNode,
  SerializedHostListItemNode,
  SerializedHostNode,
} from '../types';
import {
  listEmptyViewChild,
  listItems,
  raycastListChromeFromSerializedNode,
} from '../host-tree';

export type RaycastListPaginationView = RaycastListPaginationSerialized & {
  /** Raycast `pagination.onLoadMore` */
  onLoadMore?: () => void;
};

export type RaycastListViewProps = {
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  searchText?: string;
  /** Worker / 协议建议的默认选中 id；实际高亮由 RaycastListView 内状态与 `selectionSessionKey` 维护 */
  selectedItemId?: string;
  /** 变化时重置列表内选中态（例如 `snapshot.commandName`） */
  selectionSessionKey?: string;
  isLoading?: boolean;
  isShowingDetail?: boolean;
  filtering?: RaycastListFiltering;
  throttle?: boolean;
  pagination?: RaycastListPaginationView;
  /** Raycast `List.actions`（序列化后的宿主子树，常为 action-panel） */
  actions?: SerializedHostNode;

  /** 等价于 JSX `<List.Item />` 子节点 */
  items: SerializedHostListItemNode[];
  /** 等价于 `<List.EmptyView />` */
  emptyView?: SerializedHostEmptyNode;

  /** Raycast `onSelectionChange` */
  onSelectionChange?: (id: string) => void;
  /** Raycast `onSearchTextChange`（仅当插件提供时序列化/hydrate；未提供则宿主搜索不更新 Worker） */
  onSearchTextChange?: (text: string) => void;
};

export type ExpandRaycastListHandlers = Pick<RaycastListViewProps, 'onSelectionChange' | 'renderMarkdown'> & {
  onSearchTextChange?: (text: string) => void;
  /** 接到 Worker pagination 时用于注入 `pagination.onLoadMore` */
  onPaginationLoadMore?: () => void;
};

function mergeSearchText(snapshotText: string | undefined, propsText: string | undefined): string | undefined {
  const fromSnap = typeof snapshotText === 'string' && snapshotText.length > 0 ? snapshotText : undefined;
  if (fromSnap !== undefined) return fromSnap;
  const fromProps = typeof propsText === 'string' && propsText.length > 0 ? propsText : undefined;
  if (fromProps !== undefined) return fromProps;
  if (typeof snapshotText === 'string') return snapshotText;
  return propsText;
}

function mergeSelectedItemId(snapshotId: string | undefined, propsId: string | undefined): string | undefined {
  if (typeof snapshotId === 'string' && snapshotId.length > 0) return snapshotId;
  if (typeof propsId === 'string' && propsId.length > 0) return propsId;
  return snapshotId ?? propsId;
}

/**
 * 由协议树中的 list 节点与当前 snapshot 生成 {@link RaycastListViewProps}。
 */
export function expandRaycastListViewProps(
  listNode: SerializedHostNode,
  snapshot: RaycastViewSnapshot | null,
  handlers: ExpandRaycastListHandlers,
): RaycastListViewProps | null {
  if (listNode.type !== 'raycast:list') return null;
  const chrome = raycastListChromeFromSerializedNode(listNode);
  const items = listItems(listNode);
  const emptyView = listEmptyViewChild(listNode);

  let pagination: RaycastListPaginationView | undefined;
  if (chrome.pagination) {
    pagination = { ...chrome.pagination };
    if (handlers.onPaginationLoadMore) {
      pagination.onLoadMore = handlers.onPaginationLoadMore;
    }
  }

  return {
    navigationTitle: chrome.navigationTitle,
    searchBarPlaceholder: chrome.searchBarPlaceholder,
    searchText: mergeSearchText(snapshot?.searchText, chrome.searchTextFromProps),
    selectedItemId: mergeSelectedItemId(snapshot?.selectedItemId, chrome.selectedItemIdFromProps),
    selectionSessionKey: snapshot?.commandName ?? '',
    isLoading: chrome.isLoading,
    isShowingDetail: chrome.isShowingDetail,
    filtering: chrome.filtering,
    ...(chrome.throttle ? { throttle: true as const } : {}),
    pagination,
    actions: chrome.actions,
    items,
    emptyView,
    onSelectionChange: handlers.onSelectionChange,
    onSearchTextChange: handlers.onSearchTextChange,
    renderMarkdown: handlers.renderMarkdown,
  };
}
