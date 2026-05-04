/**
 * Custom reconciler 内部的宿主节点（与 React fiber 解耦后的最小树）。
 * 序列化层直接遍历该结构生成可 JSON 化的 VirtualNode。
 */

export type HostTextInstance = {
  type: 'text';
  /** 宿主分配的不透明 id，序列化与事件派发与 RN reactTag 同类 */
  hostId: string;
  text: string;
  parent: HostElementInstance | HostRootContainer | null;
};

export type HostElementInstance = {
  type: string;
  hostId: string;
  props: Record<string, unknown>;
  parent: HostElementInstance | HostRootContainer | null;
  children: HostInstance[];
};

/** createContainer 的根容器，仅含 children */
export type HostRootContainer = {
  children: HostInstance[];
};

export type HostInstance = HostTextInstance | HostElementInstance;

export function isHostText(n: HostInstance): n is HostTextInstance {
  return n.type === 'text';
}

export function isHostElement(n: HostInstance): n is HostElementInstance {
  return n.type !== 'text';
}
