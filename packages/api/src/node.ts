import type { ICommand, IAction } from '@public/schema';
import type * as coreApi from '@public/core';
import { parentPort, workerData } from 'node:worker_threads';

const MainToWorker = {
  BRIDGE_RESPONSE: 'm2w:bridgeResponse',
  CHANNEL_INVOKE: 'm2w:channelInvoke',
  CHANNEL_EVENT: 'm2w:channelEvent',
} as const;

const WorkerToMain = {
  INVOKE_BRIDGE: 'w2m:invokeBridge',
  CHANNEL_INVOKE: 'w2m:channelInvoke',
  CHANNEL_EMIT: 'w2m:channelEmit',
  CHANNEL_INVOKE_DONE: 'w2m:channelInvokeDone',
} as const;

type PendingCall = { resolve: (v: unknown) => void, reject: (e: Error) => void };

const pluginName = String((workerData as { name?: string } | undefined)?.name || '');
const pending = new Map<number, PendingCall>();
const channelHandlers = new Map<string, (...args: any[]) => any>();
const eventListeners = new Map<string, Set<(...args: any[]) => void>>();
let idSeq = 0;

const getParentPort = () => {
  if (!parentPort) {
    throw new Error('[public-tauri] 未在 Node 插件 Worker 中建立桥接');
  }
  return parentPort;
};

const makeBridgeRequest = <T = unknown>() => {
  idSeq += 1;
  const id = idSeq;
  const promise = new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
  });
  return { id, promise };
};

const invokeBridge = (name: string, args: unknown[] = []) => {
  const { id, promise } = makeBridgeRequest<unknown>();
  getParentPort().postMessage({
    kind: WorkerToMain.INVOKE_BRIDGE,
    id,
    bridgePayload: { name, args, pluginName },
  });
  return promise;
};

const invokeFrontendChannel = <T = unknown>(method: string, args: unknown[] = []) => {
  const { id, promise } = makeBridgeRequest<T>();
  getParentPort().postMessage({
    kind: WorkerToMain.CHANNEL_INVOKE,
    id,
    name: pluginName,
    method,
    args,
  });
  return promise;
};

function registerChannelHandler(method: string, handler: (...args: any[]) => any) {
  channelHandlers.set(method, handler);
  return () => {
    if (channelHandlers.get(method) === handler) {
      channelHandlers.delete(method);
    }
  };
}

function registerChannelListener(event: string, callback: (...args: any[]) => void) {
  let listeners = eventListeners.get(event);
  if (!listeners) {
    listeners = new Set();
    eventListeners.set(event, listeners);
  }
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) {
      eventListeners.delete(event);
    }
  };
}

function finishBridgeResponse(msg: { id: number, data?: unknown, err?: string }) {
  const pendingCall = pending.get(msg.id);
  if (!pendingCall) return;
  pending.delete(msg.id);
  if (msg.err) pendingCall.reject(new Error(msg.err));
  else pendingCall.resolve(msg.data);
}

async function invokeChannelHandler(method: string, args: any[] = []) {
  const handler = channelHandlers.get(method);
  if (!handler) {
    throw new Error(`无 ${String(method)}`);
  }
  return await handler(...args);
}

function emitChannelEvent(event: string, args: any[] = []) {
  const listeners = eventListeners.get(event);
  if (!listeners) {
    return;
  }
  for (const listener of listeners) {
    listener(...args);
  }
}

const activeParentPort = parentPort;
if (activeParentPort) {
  activeParentPort.on('message', async (msg: any) => {
    if (msg === null || msg === undefined) return;
    if (msg.kind === MainToWorker.BRIDGE_RESPONSE) {
      finishBridgeResponse({ id: msg.id, data: msg.data, err: msg.err });
      return;
    }
    if (msg.kind === MainToWorker.CHANNEL_INVOKE) {
      try {
        const data = await invokeChannelHandler(msg.method, msg.args || []);
        activeParentPort.postMessage({ kind: WorkerToMain.CHANNEL_INVOKE_DONE, id: msg.id, data });
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        activeParentPort.postMessage({ kind: WorkerToMain.CHANNEL_INVOKE_DONE, id: msg.id, err: err.message });
      }
      return;
    }
    if (msg.kind === MainToWorker.CHANNEL_EVENT) {
      emitChannelEvent(msg.event, msg.args || []);
    }
  });
}

export const fetch = globalThis.fetch.bind(globalThis);

export const utils: typeof coreApi['utils'] = {
  getCurrentPath: () => invokeBridge('utils.getCurrentPath') as Promise<string>,
  getSelectedPath: () => invokeBridge('utils.getSelectedPath') as Promise<string[]>,
  getSelectedText: () => invokeBridge('utils.getSelectedText') as Promise<string>,
  getFrontmostApplication: () => invokeBridge('utils.getFrontmostApplication') as Promise<unknown>,
  getDefaultApplication: (fileOrUrl: string) => invokeBridge('utils.getDefaultApplication', [fileOrUrl]) as Promise<unknown>,
  getApplications: (fileOrUrl: string) => invokeBridge('utils.getApplications', [fileOrUrl]) as Promise<unknown>,
  runCommand: (c: string) => invokeBridge('utils.runCommand', [c]) as Promise<string>,
  runAppleScript: (s: string) => invokeBridge('utils.runAppleScript', [s]) as Promise<string>,
  getMousePosition: () => invokeBridge('utils.getMousePosition'),
} as any;

export const mainWindow: typeof coreApi['mainWindow'] = {
  hide: () => invokeBridge('mainWindow.hide'),
  show: () => invokeBridge('mainWindow.show'),
  center: () => invokeBridge('mainWindow.center'),
  clearInput: () => {
    invokeBridge('mainWindow.clearInput');
    return Promise.resolve();
  },
  popToRoot: (o?: { clearInput?: boolean }) => {
    void invokeBridge('mainWindow.popToRoot', o ? [o] : [undefined]);
    return Promise.resolve();
  },
  pushView: (o: { path: string, params?: any }) => {
    void invokeBridge('mainWindow.pushView', [o]);
    return undefined as any;
  },
  popView: (o?: { count: number }) => {
    void invokeBridge('mainWindow.popView', [o]);
    return undefined as any;
  },
  onShow: () => {
    throw new Error('mainWindow.onShow 无法在 Node 插件中序列化回调，请用前端');
  },
  offShow: () => {
    throw new Error('mainWindow.offShow 无法在 Node 插件中序列化回调，请用前端');
  },
} as any;

export const screen: typeof coreApi['screen'] = {
  getAllMonitors: () => invokeBridge('screen.getAllMonitors'),
  capture: (m?: any) => invokeBridge('screen.capture', m !== undefined ? [m] : []),
  monitorFromPoint: (x: number, y: number) => invokeBridge('screen.monitorFromPoint', [x, y]),
  cursorMonitor: () => invokeBridge('screen.cursorMonitor'),
  currentMonitor: () => invokeBridge('screen.currentMonitor'),
} as any;

const optionalArgs = (a: any, t?: any, o?: any) => {
  if (o) {
    return [a, t, o];
  }
  if (t) {
    return [a, t];
  }
  return [a];
};

export const dialog: typeof coreApi['dialog'] = {
  showAlert: (a: any, t?: any, o?: any) => invokeBridge('dialog.showAlert', optionalArgs(a, t, o)) as any,
  showConfirm: (a: any, t?: any, o?: any) => invokeBridge('dialog.showConfirm', optionalArgs(a, t, o)) as any,
  showToast: (a: any, o?: any) => invokeBridge('dialog.showToast', o ? [a, o] : [a]) as any,
} as any;

export const permissions: typeof coreApi['permissions'] = {
  checkAll: () => invokeBridge('permissions.checkAll'),
  checkAccessibility: () => invokeBridge('permissions.checkAccessibility'),
  checkAppleScript: () => invokeBridge('permissions.checkAppleScript'),
  checkScreenRecording: () => invokeBridge('permissions.checkScreenRecording'),
  openAccessibilitySettings: () => invokeBridge('permissions.openAccessibilitySettings'),
  openScreenRecordingSettings: () => invokeBridge('permissions.openScreenRecordingSettings'),
  openAutomationSettings: () => invokeBridge('permissions.openAutomationSettings'),
} as any;

export const clipboard: any = {
  readText: () => invokeBridge('clipboard.readText'),
  writeText: (s: string) => invokeBridge('clipboard.writeText', [s]),
  paste: () => invokeBridge('clipboard.paste'),
  writeImage: (b: any) => invokeBridge('clipboard.writeImage', [b]),
} as any;

export const showSaveFilePicker: typeof coreApi['showSaveFilePicker'] = ((...args: any[]) => invokeBridge('showSaveFilePicker', args)) as any;
export const Database = {} as any;
export const storage: any = {
  get: () => {
    throw new Error('未实现');
  },
};
export const WebviewWindow = {} as any;
export const Webview = {} as any;
export const NativeWindow = {} as any;
export const resolveFileIcon = (() => {
  throw new Error('在 server 中请使用 Node 或 fetch');
}) as any;
export const resolveLocalPath = (() => {
  throw new Error('在 server 中未实现');
}) as any;
export const fs: any = {};
export const shell: any = {};
export const opener: any = {};

export const channel: coreApi.PluginChannel = {
  invoke: <T = any>(name: string, ...args: any[]) => invokeFrontendChannel<T>(name, args),
  handle: registerChannelHandler,
  emit: (event: string, ...args: any[]) => {
    getParentPort().postMessage({
      kind: WorkerToMain.CHANNEL_EMIT,
      name: pluginName,
      event,
      args,
    });
  },
  on: registerChannelListener,
  once: (event: string, callback: (...args: any[]) => void) => {
    let off = () => {};
    off = registerChannelListener(event, (...args: any[]) => {
      off();
      callback(...args);
    });
    return off;
  },
  off: (event: string, callback: (...args: any[]) => void) => {
    const listeners = eventListeners.get(event);
    listeners?.delete(callback);
    if (listeners?.size === 0) {
      eventListeners.delete(event);
    }
  },
};

export const updateCommands = (commands: ICommand[]) => invokeBridge('updateCommands', [commands]);

export const getPreferences = <T = Record<string, any>>(): T => Object.create(null) as T;

export const updateActions = (actions: IAction[]) => invokeBridge('updateActions', [actions]);

export const definePlugin: typeof import('./index').definePlugin = (f: any) => f;

export const updateSearchBarValue = (value: string) => invokeBridge('updateSearchBarValue', [value]);
export const updateSearchBarVisible = (visible: boolean) => invokeBridge('updateSearchBarVisible', [visible]);
