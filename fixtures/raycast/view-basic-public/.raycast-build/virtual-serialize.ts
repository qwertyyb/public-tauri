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
import {
  Action,
  ActionPanel,
  ActionPanelSection,
  ActionPanelSubmenu,
  Detail,
} from '@public-tauri/api/raycast';

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

function findListInSnapshot(node: SerializedHostNode): SerializedHostNode | undefined {
  if (node.type === 'raycast:list') return node;
  if (node.type === 'text') return undefined;
  for (const ch of node.children) {
    const hit = findListInSnapshot(ch);
    if (hit) return hit;
  }
  return undefined;
}

function listItemNodes(list: SerializedHostNode): SerializedHostNode[] {
  if (list.type === 'text') return [];
  return list.children.filter(c => c.type === 'raycast:list-item');
}

function businessIdForListItem(item: SerializedHostNode): string {
  if (item.type === 'text') return item.hostId;
  return String(item.props.id ?? item.props.title ?? item.hostId);
}

function serializeActionProps(
  props: Record<string, unknown>,
  hostId: string,
  handlers: HostEventHandlerRegistry,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (SKIP_PROP_KEYS.has(k) || k === 'children') continue;
    if (typeof v === 'function') {
      handlers.set(`${hostId}:${k}`, v as (...args: unknown[]) => void | Promise<void>);
      out[k] = `${RAYCAST_SERIALIZED_FUNC_PREFIX}${k}`;
      continue;
    }
    if (v === undefined) continue;
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
      continue;
    }
    const c = cloneJsonSafe(v);
    if (c !== undefined) out[k] = c;
  }
  return out;
}

function serializeActionsReactTree(
  node: React.ReactNode,
  handlers: HostEventHandlerRegistry,
  nextSlotId: () => string,
): SerializedHostNode | undefined {
  if (!React.isValidElement(node)) return undefined;
  const el = node as React.ReactElement<Record<string, unknown>>;
  if (el.type === ActionPanel || (el.type as { name?: string })?.name === 'ActionPanel') {
    const panelId = nextSlotId();
    const rawKids = React.Children.toArray(el.props?.children as React.ReactNode);
    const children = rawKids
      .map(ch => serializeActionsReactTree(ch, handlers, nextSlotId))
      .filter((x): x is SerializedHostNode => x != null);
    const panelProps: Record<string, unknown> = {};
    if (el.props?.title != null) panelProps.title = String(el.props.title);
    return {
      hostId: panelId,
      type: 'raycast:action-panel',
      props: panelProps,
      children,
    };
  }
  if (
    el.type === ActionPanelSection
    || el.type === ActionPanel.Section
    || (el.type as { name?: string })?.name === 'ActionPanelSection'
  ) {
    const sectionId = nextSlotId();
    const rawSectionKids = React.Children.toArray(el.props?.children as React.ReactNode);
    const sectionChildren = rawSectionKids
      .map(ch => serializeActionsReactTree(ch, handlers, nextSlotId))
      .filter((x): x is SerializedHostNode => x != null);
    const sectionProps: Record<string, unknown> = {};
    if (el.props?.title != null) sectionProps.title = String(el.props.title);
    return {
      hostId: sectionId,
      type: 'raycast:action-panel-section',
      props: sectionProps,
      children: sectionChildren,
    };
  }
  if (
    el.type === ActionPanelSubmenu
    || el.type === ActionPanel.Submenu
    || (el.type as { name?: string })?.name === 'ActionPanelSubmenu'
  ) {
    const submenuId = nextSlotId();
    const rawSubmenuKids = React.Children.toArray(el.props?.children as React.ReactNode);
    const submenuChildren = rawSubmenuKids
      .map(ch => serializeActionsReactTree(ch, handlers, nextSlotId))
      .filter((x): x is SerializedHostNode => x != null);
    return {
      hostId: submenuId,
      type: 'raycast:action-panel-submenu',
      props: serializeActionProps(el.props ?? {}, submenuId, handlers),
      children: submenuChildren,
    };
  }
  if (el.type === Action || (el.type as { name?: string })?.name === 'Action') {
    const hid = nextSlotId();
    return {
      hostId: hid,
      type: 'raycast:action',
      props: serializeActionProps(el.props ?? {}, hid, handlers),
      children: [],
    };
  }
  if (typeof el.type === 'function') {
    try {
      const rendered = (el.type as React.FC<Record<string, unknown>>)(el.props ?? {});
      return serializeActionsReactTree(rendered, handlers, nextSlotId);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function serializeDetailReactSlot(
  el: React.ReactElement,
  nextSlotId: () => string,
): SerializedHostNode {
  const element = el as React.ReactElement<{ markdown?: string }>;
  const hid = nextSlotId();
  if (element.type === Detail || (element.type as { name?: string })?.name === 'Detail') {
    return {
      hostId: hid,
      type: 'raycast:detail',
      props: { markdown: String(element.props?.markdown || '') },
      children: [],
    };
  }
  return {
    hostId: hid,
    type: 'raycast:empty',
    props: {},
    children: [],
  };
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
    if (React.isValidElement(v)) {
      if (k === 'detail') {
        out[k] = serializeDetailReactSlot(v, nextSlotId);
        continue;
      }
      if (k === 'actions') {
        const tree = serializeActionsReactTree(v, handlers, nextSlotId);
        if (tree) out[k] = tree;
        continue;
      }
      continue;
    }
    if (v === undefined) continue;
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
      continue;
    }
    const c = cloneJsonSafe(v);
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
  meta: { commandName: string; selectedItemId: string; searchText: string },
): RaycastViewSnapshot {
  handlers.clear();
  let slotSeq = 0;
  const nextSlotId = () => {
    slotSeq += 1;
    return `rv:p:${slotSeq}`;
  };
  const root = serializeHostSubtree(rootChildren[0], handlers, nextSlotId);
  const list = findListInSnapshot(root);
  const items = list ? listItemNodes(list) : [];
  const firstItem = items[0];
  const nextSelectedItemId = meta.selectedItemId || (firstItem ? businessIdForListItem(firstItem) : undefined);
  return {
    commandName: meta.commandName,
    root,
    selectedItemId: nextSelectedItemId,
    searchText: meta.searchText,
  };
}
