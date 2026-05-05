/** Worker 下发给视图端的宿主树快照（JSON-safe）。 */

/**
 * 函数型 prop 在快照中的占位前缀；完整 token 为 `${RAYCAST_SERIALIZED_FUNC_PREFIX}${propName}`（propName 即 Worker Registry 事件名，如 `onAction`）。
 * 视图端应反序列化为可调函数并 `channel.invoke('raycast:view:run-action', { commandName, hostId, event: propName, args })`。
 */
export const RAYCAST_SERIALIZED_FUNC_PREFIX = '__func__';

export type SerializedHostElementNode = {
  hostId: string;
  type: string;
  props: Record<string, unknown>;
  children: SerializedHostNode[];
};

export type SerializedHostNode =
  | { hostId: string; type: 'text'; text: string }
  | SerializedHostElementNode;

export type RaycastViewSnapshot = {
  commandName: string;
  root: SerializedHostNode;
  error?: string;
};

export type RaycastViewMountPayload = {
  commandName: string;
  query?: string;
  preferences?: Record<string, unknown>;
  options?: Record<string, unknown>;
};

/** run-action 通道：hostId 为 SerializedHostNode.hostId（含 props slot 内合成的 rv:p:*） */
export type RaycastViewDispatchPayload = {
  commandName: string;
  hostId: string;
  /** 缺省为 onAction；与序列化 token 中 prop 名一致 */
  event?: string;
  /** 透传给 Worker 端 handler（`handlers.get(hostId + ':' + event)`） */
  args?: unknown[];
};
