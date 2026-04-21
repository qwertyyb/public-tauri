/**
 * 全局键盘层：单例 window.capture 分发，按 priority 从高到低调用 handler，首个返回 true 则消费事件。
 * 与 document/bubble 监听并存时，同阶段内顺序仍依赖注册先后；壳层快捷键应通过本模块注册以与 ResultView 等一致。
 */

export const KEYBOARD_LAYER_PRIORITY_ACTION_PANEL = 100;
export const KEYBOARD_LAYER_PRIORITY_RESULT_LIST = 10;
export const KEYBOARD_LAYER_PRIORITY_PUBLIC_LAYOUT = 5;

export interface KeyboardLayerHandle {
  readonly id: string;
  readonly active: boolean;
  dispose: () => void;
  setEnabled: (enabled: boolean) => void;
}

type LayerRecord = {
  token: object;
  id: string;
  priority: number;
  enabled: boolean;
  disposed: boolean;
  insertOrder: number;
  handler: (e: KeyboardEvent) => boolean | void;
  activated?: () => void;
  deactivated?: () => void;
};

const layers: LayerRecord[] = [];
let insertOrder = 0;
let lastTop: LayerRecord | null = null;

let boundDispatch: ((e: KeyboardEvent) => void) | null = null;

function attachListener() {
  if (boundDispatch || layers.filter(l => !l.disposed).length === 0) return;
  boundDispatch = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const ordered = layers
      .filter(l => !l.disposed && l.enabled)
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.insertOrder - a.insertOrder;
      });
    for (const layer of ordered) {
      const consumed = layer.handler(e) === true;
      if (consumed) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
  };
  window.addEventListener('keydown', boundDispatch, true);
}

function detachListenerIfIdle() {
  if (layers.some(l => !l.disposed)) return;
  if (boundDispatch) {
    window.removeEventListener('keydown', boundDispatch, true);
    boundDispatch = null;
  }
}

function topRecord(): LayerRecord | null {
  const active = layers.filter(l => !l.disposed && l.enabled);
  if (active.length === 0) return null;
  return active.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.insertOrder - a.insertOrder;
  })[0]!;
}

function recomputeTopCallbacks() {
  const next = topRecord();
  if (next?.token === lastTop?.token) return;
  lastTop?.deactivated?.();
  lastTop = next ?? null;
  lastTop?.activated?.();
}

export interface RegisterKeyboardLayerOptions {
  id: string;
  priority: number;
  enabled?: boolean;
  handler: (e: KeyboardEvent) => boolean | void;
  activated?: () => void;
  deactivated?: () => void;
}

export function registerKeyboardLayer(options: RegisterKeyboardLayerOptions): KeyboardLayerHandle {
  const token = {};
  const enabled = options.enabled !== false;
  const order = insertOrder;
  insertOrder += 1;
  const record: LayerRecord = {
    token,
    id: options.id,
    priority: options.priority,
    enabled,
    disposed: false,
    insertOrder: order,
    handler: options.handler,
    activated: options.activated,
    deactivated: options.deactivated,
  };
  layers.push(record);
  attachListener();
  recomputeTopCallbacks();

  const handle: KeyboardLayerHandle = {
    id: options.id,
    get active() {
      return !record.disposed && record.enabled;
    },
    dispose: () => {
      if (record.disposed) return;
      record.disposed = true;
      const wasTop = lastTop?.token === record.token;
      if (wasTop) {
        record.deactivated?.();
        lastTop = null;
      }
      const idx = layers.indexOf(record);
      if (idx >= 0) layers.splice(idx, 1);
      recomputeTopCallbacks();
      detachListenerIfIdle();
    },
    setEnabled: (next: boolean) => {
      if (record.disposed) return;
      if (next === record.enabled) return;
      record.enabled = next;
      recomputeTopCallbacks();
    },
  };
  return handle;
}
