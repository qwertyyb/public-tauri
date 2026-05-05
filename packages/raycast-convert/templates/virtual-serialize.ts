/**
 * 将 HostInstance 树序列化为可 JSON 的快照（raycast-view-protocol）。
 *
 * - 元素节点来自 reconciler，自带 hostId；props 中的 React slot（detail / actions）在序列化时展开并分配 rv:p:* 合成 id。
 * - 函数型 props：写入 Worker Map[`${hostId}:${propName}`]，快照中序列化为 \`${RAYCAST_SERIALIZED_FUNC_PREFIX}\${propName}\`（JSON 字符串）。
 */
import React from 'react';
import {
  RAYCAST_SERIALIZED_FUNC_PREFIX,
  type RaycastViewSnapshot,
  type SerializedHostNode,
} from './raycast-view-protocol';
import type { HostInstance } from './host-instance';
import { isHostText } from './host-instance';

export type HostEventHandlerRegistry = Map<string, (...args: unknown[]) => void | Promise<void>>;

const SKIP_PROP_KEYS = new Set(['key', 'ref', '__self', '__source']);

function cloneJsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'symbol' || typeof value === 'function') return undefined;
  if (Array.isArray(value)) {
    const arr = value.map(cloneJsonSafe).filter(v => v !== undefined);
    return arr;
  }
  if (typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function isHostTextLike(value: unknown): value is { hostId: string; type: 'text'; text: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return obj.type === 'text' && typeof obj.hostId === 'string' && typeof obj.text === 'string';
}

function isHostElementLike(value: unknown): value is {
  hostId: string;
  type: string;
  props: Record<string, unknown>;
  children: unknown[];
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.hostId === 'string'
    && typeof obj.type === 'string'
    && obj.type !== 'text'
    && typeof obj.props === 'object'
    && obj.props !== null
    && !Array.isArray(obj.props)
    && Array.isArray(obj.children)
  );
}

function isHostInstanceLike(value: unknown): value is HostInstance {
  return isHostTextLike(value) || isHostElementLike(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isReactElementLike(value: unknown): value is { $$typeof: unknown } {
  return Boolean(value && typeof value === 'object' && '$$typeof' in (value as Record<string, unknown>));
}

function serializeReactElementTree(
  value: unknown,
  handlers: HostEventHandlerRegistry,
  nextSlotId: () => string,
): SerializedHostNode | undefined {
  if (!React.isValidElement(value)) return undefined;
  const el = value as React.ReactElement<Record<string, unknown>>;
  const { type } = el;

  if (typeof type === 'function') {
    try {
      const rendered = type(el.props ?? {});
      return serializeReactElementTree(rendered, handlers, nextSlotId);
    } catch {
      return undefined;
    }
  }

  if (typeof type === 'symbol') {
    const children = React.Children.toArray(el.props?.children as React.ReactNode)
      .map(ch => serializeReactElementTree(ch, handlers, nextSlotId))
      .filter((x): x is SerializedHostNode => x !== undefined);
    return children[0];
  }

  if (typeof type !== 'string') return undefined;

  const hostId = nextSlotId();
  const propsOut = serializeHostProps(el.props ?? {}, hostId, handlers, nextSlotId);
  const children = React.Children.toArray(el.props?.children as React.ReactNode)
    .map(ch => serializeReactElementTree(ch, handlers, nextSlotId))
    .filter((x): x is SerializedHostNode => x !== undefined);

  return {
    hostId,
    type,
    props: propsOut,
    children,
  };
}

function serializeUnknownPropValue(
  value: unknown,
  handlers: HostEventHandlerRegistry,
  nextSlotId: () => string,
  seen: WeakSet<object>,
): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (isHostInstanceLike(value)) {
    return serializeHostSubtree(value, handlers, nextSlotId);
  }
  if (Array.isArray(value)) {
    return value
      .map(item => serializeUnknownPropValue(item, handlers, nextSlotId, seen))
      .filter(item => item !== undefined);
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return undefined;
    seen.add(value);

    if (isReactElementLike(value)) {
      return serializeReactElementTree(value, handlers, nextSlotId);
    }

    if (!isPlainRecord(value)) {
      return cloneJsonSafe(value);
    }

    const obj = value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'function') continue;
      const serialized = serializeUnknownPropValue(v, handlers, nextSlotId, seen);
      if (serialized !== undefined) out[k] = serialized;
    }
    return out;
  }
  return cloneJsonSafe(value);
}

function serializeHostProps(
  props: Record<string, unknown>,
  hostId: string,
  handlers: HostEventHandlerRegistry,
  nextSlotId: () => string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (SKIP_PROP_KEYS.has(k) || k === 'children') continue;
    if (typeof v === 'function') {
      handlers.set(`${hostId}:${k}`, v as (...args: unknown[]) => void | Promise<void>);
      out[k] = `${RAYCAST_SERIALIZED_FUNC_PREFIX}${k}`;
      continue;
    }
    const c = serializeUnknownPropValue(v, handlers, nextSlotId, new WeakSet<object>());
    if (c !== undefined) out[k] = c;
  }
  return out;
}

function serializeHostSubtree(
  node: HostInstance | undefined,
  handlers: HostEventHandlerRegistry,
  nextSlotId: () => string,
): SerializedHostNode {
  if (!node) {
    return { hostId: 'rv:root:empty', type: 'raycast:empty', props: {}, children: [] };
  }
  if (isHostText(node)) {
    return { hostId: node.hostId, type: 'text', text: node.text };
  }
  const propsOut = serializeHostProps(node.props, node.hostId, handlers, nextSlotId);
  const children = node.children.map(ch => serializeHostSubtree(ch, handlers, nextSlotId));
  return { hostId: node.hostId, type: node.type, props: propsOut, children };
}

export function buildSnapshotFromHostRoot(
  rootChildren: HostInstance[],
  handlers: HostEventHandlerRegistry,
  meta: { commandName: string },
): RaycastViewSnapshot {
  handlers.clear();
  let slotSeq = 0;
  const nextSlotId = () => {
    slotSeq += 1;
    return `rv:p:${slotSeq}`;
  };
  console.log('rootChildren', rootChildren);
  const root = serializeHostSubtree(rootChildren[0], handlers, nextSlotId);
  return {
    commandName: meta.commandName,
    root,
  };
}
