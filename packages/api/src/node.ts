import type { ICommand, IAction, IPluginLifecycle } from '@public/schema';
import type * as coreApi from '@public/core';

type Bridge = {
  getPluginName: () => string
  nodeInvoke: (method: string, args?: any[], options?: { raw?: boolean }) => Promise<unknown>
  host: (body: Record<string, unknown>) => Promise<unknown>
};

const getB = (): Bridge => {
  const b = (globalThis as { __publicTauriNodeBridge?: Bridge }).__publicTauriNodeBridge;
  if (!b) {
    throw new Error('[public-tauri] 未在 Node 插件 Worker 中建立桥接');
  }
  return b;
};

const ni = (method: string, args: any[] = [], options: { raw?: boolean } = {}) => getB().nodeInvoke(method, args, options);

const hostTauri = (cmd: string, invokeArgs?: Record<string, unknown>) =>
  getB().host({ op: 'tauri:invoke', pluginName: getB().getPluginName(), cmd, invokeArgs });

const hostCore = (objectPath: string[], args: unknown[]) =>
  getB().host({ op: 'core-apply', pluginName: getB().getPluginName(), objectPath, args });

/** 与 /utils/invoke 同源（A 类，不经 WebView） */
export const fetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const { signal, ...rest0 } = init || {};
  let rest = rest0;
  if (init?.headers && init.headers instanceof Headers) {
    const headers: Record<string, string> = {};
    (init.headers as Headers).forEach((v, k) => { headers[k] = v; });
    rest = { ...rest, headers } as any;
  }
  const v = await ni('fetch', [input, { ...rest, headers: (rest as any).headers }], { raw: false });
  if (v && typeof v === 'object' && (v as { __fetchResult?: boolean }).__fetchResult) {
    const f = v as { bodyBase64: string, status: number, statusText: string, headers: Record<string, string> };
    const buf = Buffer.from(f.bodyBase64, 'base64');
    return new Response(Uint8Array.from(buf), { status: f.status, statusText: f.statusText, headers: f.headers });
  }
  throw new Error('[public-tauri] fetch: unexpected result');
};

export const utils: typeof coreApi['utils'] = {
  getCurrentPath: () => ni('system.getCurrentPath', []) as Promise<string>,
  getSelectedPath: () => ni('system.getSelectedPath', []) as Promise<string[]>,
  getSelectedText: () => ni('system.getSelectedText', []) as Promise<string>,
  getFrontmostApplication: () => hostTauri('get_frontmost_application', {}) as Promise<unknown>,
  getDefaultApplication: (fileOrUrl: string) => hostTauri('get_default_application', { fileOrUrl }) as Promise<unknown>,
  getApplications: (fileOrUrl: string) => hostTauri('get_application', { fileOrUrl }) as Promise<unknown>,
  runCommand: (c: string) => ni('system.runCommand', [c]) as Promise<string>,
  runAppleScript: (s: string) => ni('system.runAppleScript', [s]) as Promise<string>,
  getMousePosition: () => hostCore(['utils', 'getMousePosition'], []),
} as any;

export const mainWindow: typeof coreApi['mainWindow'] = {
  hide: () => hostCore(['mainWindow', 'hide'], []),
  show: () => hostCore(['mainWindow', 'show'], []),
  center: () => hostCore(['mainWindow', 'center'], []),
  clearInput: () => { hostCore(['mainWindow', 'clearInput'], []); return Promise.resolve(); },
  popToRoot: (o?: { clearInput?: boolean }) => {
    void hostCore(['mainWindow', 'popToRoot'], o ? [o] : [undefined]);
    return Promise.resolve();
  },
  pushView: o => { void hostCore(['mainWindow', 'pushView'], [o]); return undefined as any; },
  popView: o => { void hostCore(['mainWindow', 'popView'], [o]); return undefined as any; },
  onShow: () => { throw new Error('mainWindow.onShow 无法在 Node 插件中序列化回调，请用前端'); },
  offShow: () => { throw new Error('mainWindow.offShow 无法在 Node 插件中序列化回调，请用前端'); },
} as any;

export const screen: typeof coreApi['screen'] = {
  getAllMonitors: () => hostCore(['screen', 'getAllMonitors'], []),
  capture: m => hostCore(['screen', 'capture'], m !== undefined ? [m] : []),
  monitorFromPoint: (x, y) => hostCore(['screen', 'monitorFromPoint'], [x, y]),
  cursorMonitor: () => hostCore(['screen', 'cursorMonitor'], []),
  currentMonitor: () => hostCore(['screen', 'currentMonitor'], []),
} as any;

export const dialog: typeof coreApi['dialog'] = {
  showAlert: (a, t, o) => hostCore(['dialog', 'showAlert'], o ? [a, t, o] : t ? [a, t] : [a]) as any,
  showConfirm: (a, t, o) => hostCore(['dialog', 'showConfirm'], o ? [a, t, o] : t ? [a, t] : [a]) as any,
  showToast: (a, o) => hostCore(['dialog', 'showToast'], o ? [a, o] : [a]) as any,
} as any;

export const permissions: typeof coreApi['permissions'] = {
  checkAll: () => hostTauri('check_permissions', {}),
  checkAccessibility: () => hostTauri('check_accessibility_permission', {}),
  checkAppleScript: () => hostTauri('check_applescript_permission', {}),
  checkScreenRecording: () => hostTauri('check_screen_recording_permission', {}),
  openAccessibilitySettings: () => hostTauri('open_accessibility_settings', {}),
  openScreenRecordingSettings: () => hostTauri('open_screen_recording_settings', {}),
  openAutomationSettings: () => hostTauri('open_automation_settings', {}),
} as any;

const clipboardB = (m: string, a: any[] = []) => hostCore(['clipboard', m], a);

export const clipboard: any = {
  readText: () => clipboardB('readText', []),
  writeText: (s: string) => clipboardB('writeText', [s]),
  paste: () => ni('keyboard.press', ['LeftCmd', 'V']),
  writeImage: (b: any) => clipboardB('writeImage', [b]),
} as any;

export const system = { autostart: {} } as any;

export const showSaveFilePicker: typeof coreApi['showSaveFilePicker'] = (() => { throw new Error('showSaveFilePicker: use host 渠道'); }) as any;
export const Database = {} as any;
export const storage: any = { get: () => { throw new Error('未实现'); } };
export const WebviewWindow = {} as any;
export const Webview = {} as any;
export const NativeWindow = {} as any;
export const resolveFileIcon = (() => { throw new Error('在 server 中请使用 Node 或 fetch'); }) as any;
export const resolveLocalPath = (() => { throw new Error('在 server 中未实现'); }) as any;
export const fs: any = {};
export const shell: any = {};
export const opener: any = {};

export const invoke: <R = any>(n: string, ...a: any[]) => Promise<R> = () => {
  throw new Error('invoke: Node server 中不支持从 Worker 反向调用插件导出方法，请从前端调用 server invoke');
};

export const on = () => { throw new Error('on: Node server 中不支持监听插件前端 socket 事件'); };

export const updateCommands = (commands: ICommand[]) => { throw new Error('updateCommands: 在 server 中无 UI'); };

export const getPreferences = <T = Record<string, any>>(): T => ({} as T);

export const updateActions = (_: IAction[]) => { throw new Error('setActions: 在 server 中无 UI'); };

export const definePlugin: typeof import('./index').definePlugin = (f: any) => f;

export const updateSearchBarValue = () => { throw new Error('在 server 中无搜索栏'); };
export const updateSearchBarVisible = () => { throw new Error('在 server 中无搜索栏'); };
