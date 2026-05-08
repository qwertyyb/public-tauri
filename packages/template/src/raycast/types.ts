/**
 * 与 `raycast-convert` 生成的 `raycast-view-protocol.ts` 保持一致；修改协议时请同步此文件。
 */

/** 与 {@link RAYCAST_SERIALIZED_FUNC_PREFIX} 同源；勿与真实业务字符串撞车。 */
export const RAYCAST_SERIALIZED_FUNC_PREFIX = '__func__' as const;

export type { JsonPatchOp } from './json-patch';

export type SerializedHostElementNode<
  Props extends Record<string, unknown> = Record<string, unknown>,
  ChildProps extends Record<string, unknown> = Record<string, unknown>
> = {
  hostId: string;
  type: string;
  props: Props;
  children: SerializedHostElementNode<ChildProps>[];
};

export type SerializedHostNode = SerializedHostElementNode;

/** ActionBar / dispatch-host-event 使用的动作节点 */
export type SerializedHostActionNode = SerializedHostElementNode & { type: 'raycast:action' };

export type SerializedHostListDetailNode = SerializedHostElementNode<{
  markdown: string;
  isLoading?: boolean;
  metadata?: SerializedHostNode;
}> & { type: 'raycast:list-item-detail' };

/** List 子节点 */
export type SerializedHostListItemNode = SerializedHostElementNode<{
  title: string;
  accessories?: SerializedHostElementNode[];
  actions?: SerializedHostElementNode[];
  icon?: string;
  id?: string;
  keywords?: string[];
  quickLook?: { name?: string, path: string };
  subtitle?: string;
  detail?: SerializedHostDetailNode
}> & { type: 'raycast:list-item' };

export type SerializedHostDetailNode = SerializedHostElementNode<{
  markdown: string;
  isLoading?: boolean;
  metadata?: SerializedHostNode;
  actions: SerializedHostElementNode[];
  navigationTitle?: string;
}> & { type: 'raycast:detail' };

export type SerializedHostEmptyNode = SerializedHostElementNode & { type: 'raycast:empty' };

export type RaycastShortcut = {
  modifiers?: string[];
  key?: string;
};

/** @see https://developers.raycast.com/api-reference/user-interface/list — List.filtering */
export type RaycastListFiltering = boolean | { keepSectionOrder?: boolean };

/** 序列化后可跨快照的 pagination（不含 onLoadMore；由视图侧注入） */
export type RaycastListPaginationSerialized = {
  hasMore: boolean;
  pageSize: number;
};

export type RaycastViewSnapshot = {
  commandName: string;
  root: SerializedHostNode;
  selectedItemId?: string;
  searchText: string;
  error?: string;
};

export type RaycastViewDispatchPayload = {
  commandName: string;
  hostId: string;
  event?: string;
  args?: unknown[];
};

export type RaycastCommandArgumentOption = {
  title: string;
  value: string;
};

export type RaycastCommandArgument = {
  name: string;
  type: 'text' | 'password' | 'dropdown';
  placeholder?: string;
  required?: boolean;
  data?: RaycastCommandArgumentOption[];
};

/** `plugin:action` 里 `detail.command` 的子集，供参数表单组件自行解析展示 */
export type RaycastArgumentsFormCommand = {
  name: string;
  title?: string;
  raycastArguments?: RaycastCommandArgument[];
};
