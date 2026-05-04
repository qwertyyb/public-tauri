/**
 * 将 Worker 下发的 JSON 快照中的 `__func__${eventName}` 占位符还原为可调函数（通过 `raycast:view:run-action` 回传 Worker）。
 */
import type {
  RaycastViewDispatchPayload,
  RaycastViewSnapshot,
  SerializedHostElementNode,
  SerializedHostNode,
} from './types';
import { RAYCAST_SERIALIZED_FUNC_PREFIX } from './types';

function isSerializedHostTree(v: unknown): v is SerializedHostElementNode {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.hostId === 'string'
    && typeof o.type === 'string'
    && o.type !== 'text'
    && o.props !== null && typeof o.props === 'object' && !Array.isArray(o.props)
    && Array.isArray(o.children)
  );
}

function isFuncToken(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(RAYCAST_SERIALIZED_FUNC_PREFIX);
}

/** 旧版快照 `{ kind: 'eventRef', event }`（仍与 Worker Registry 键一致） */
function isLegacyEventRef(v: unknown): v is { kind: 'eventRef'; event: string } {
  return (
    typeof v === 'object'
    && v !== null
    && (v as { kind?: string }).kind === 'eventRef'
    && typeof (v as { event?: string }).event === 'string'
  );
}

function eventNameFromToken(token: string): string {
  return token.slice(RAYCAST_SERIALIZED_FUNC_PREFIX.length);
}

export type HydrateSnapshotContext = {
  getCommandName: () => string;
  dispatch: (payload: RaycastViewDispatchPayload) => void | Promise<unknown>;
};

function bindFunc(hostId: string, token: string, ctx: HydrateSnapshotContext) {
  const event = eventNameFromToken(token) || 'onAction';
  return (...args: unknown[]) => {
    const commandName = ctx.getCommandName();
    if (!commandName) return;
    const payload: RaycastViewDispatchPayload = {
      commandName,
      hostId,
      event,
      ...(args.length > 0 ? { args } : {}),
    };
    void ctx.dispatch(payload);
  };
}

function hydrateValue(v: unknown, hostId: string, ctx: HydrateSnapshotContext): unknown {
  if (isFuncToken(v)) {
    return bindFunc(hostId, v, ctx);
  }
  if (isLegacyEventRef(v)) {
    return bindFunc(hostId, `${RAYCAST_SERIALIZED_FUNC_PREFIX}${v.event}`, ctx);
  }
  if (v === null || v === undefined || typeof v !== 'object') {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map((x) => hydrateValue(x, hostId, ctx));
  }
  if (isSerializedHostTree(v)) {
    return hydrateSerializedSubtree(v, ctx);
  }
  const o = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(o)) {
    out[k] = hydrateValue(val, hostId, ctx);
  }
  return out;
}

function hydrateSerializedSubtree(node: SerializedHostElementNode, ctx: HydrateSnapshotContext): SerializedHostElementNode {
  const props: Record<string, unknown> = { ...node.props };
  for (const [k, val] of Object.entries(props)) {
    props[k] = hydrateValue(val, node.hostId, ctx);
  }
  const children = node.children.map((ch) => {
    if (ch.type === 'text') return ch;
    return hydrateSerializedSubtree(ch as SerializedHostElementNode, ctx);
  });
  return { ...node, props, children };
}

function hydrateRoot(node: SerializedHostNode, ctx: HydrateSnapshotContext): SerializedHostNode {
  if (node.type === 'text') {
    return { ...node };
  }
  return hydrateSerializedSubtree(node as SerializedHostElementNode, ctx);
}

/**
 * 深拷贝后把快照里所有 `__func__*` 字符串替换为绑定 `hostId` 的回调。
 */
export function hydrateRaycastViewSnapshot(snap: RaycastViewSnapshot, ctx: HydrateSnapshotContext): RaycastViewSnapshot {
  const clone = JSON.parse(JSON.stringify(snap)) as RaycastViewSnapshot;
  clone.root = hydrateRoot(clone.root, ctx);
  return clone;
}
