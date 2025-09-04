import * as clipboardBase from 'tauri-plugin-clipboard-api';
import { cursorPosition, getCurrentWindow } from '@tauri-apps/api/window';
import * as autostart from '@tauri-apps/plugin-autostart';
import { invokeServerUtils } from './utils';
import { useRouter, onPageEnter, onPageLeave, pageEventSymbol, routerSymbol } from './router';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';
export * as globalShortcut from '@tauri-apps/plugin-global-shortcut';

const listenMap = new WeakMap<Function, UnlistenFn>();
export const mainWindow = {
  hide() {
    return getCurrentWindow().hide();
  },
  show() {
    return getCurrentWindow().show();
  },
  clearInput() {
    window.dispatchEvent(new CustomEvent('clearInput'));
  },
  popToRoot(options?: { clearInput?: boolean }) {
    window.dispatchEvent(new CustomEvent('pop-to-root', { detail: { ...options } }));
  },
  pushView: (options: { path: string, params?: any }) => window.dispatchEvent(new CustomEvent('push-view', { detail: { ...options } })),
  popView: (options: { count: number } = { count: 1 }) => window.dispatchEvent(new CustomEvent('pop-view', { detail: { ...options } })),
  onShow: async (callback: () => void) => {
    const unlisten = await listen('focus', (event) => {
      if (event.payload) {
        callback();
      }
    });
    listenMap.set(callback, unlisten);
  },
  offShow: (callback: () => void) => {
    listenMap.get(callback)?.();
  },
};

interface ScreenDetail {
  id: number
  name: number
  width: number
  height: number
  isBuiltin: boolean
  isPrimary: boolean
  x: number
  y: number
}

export const screen = {
  getDetails: () => invoke<ScreenDetail[]>('get_monitors'),
  capture: (id: number) => invoke<string>('screenshot', { id }),
  screenFromPoint: (x: number, y: number) => invoke<ScreenDetail>('monitor_from_point', { x: Math.round(x), y: Math.round(y) }),
};

export const dialog = {
  showAlert(message: string, title?: string, options?: { type: 'info' | 'warning' | 'error', confirmText: string }) {
    return new Promise<void>((resolve) => {
      window.dispatchEvent(new CustomEvent('app:showAlert', { detail: { options: { message, title, ...options, onConfirm: resolve } } }));
    });
  },
  showConfirm(message: string, title?: string, options?: { type: 'info' | 'warning' | 'error', confirmText: string, cancelText: string }) {
    return new Promise<void>((resolve, reject) => {
      window.dispatchEvent(new CustomEvent('app:showConfirm', { detail: { options: { message, title, ...options, onConfirm: resolve, onCancel: () => reject('cancel') } } }));
    });
  },
  showToast(message: string, options?: { duration: number, icon: string }) {
    return new Promise<void>((resolve) => {
      window.dispatchEvent(new CustomEvent('app:showToast', { detail: { options: { message, ...options, done: resolve } } }));
    });
  },
};

export const clipboard = {
  ...clipboardBase,
  paste: () => invokeServerUtils('keyboard.press', ['LeftCmd', 'V']),
};

export const fetch = (...args: Parameters<typeof window.fetch>): Promise<Response> => invokeServerUtils('fetch', args, { raw: true });

interface IApplication {
  displayName: string
  executablePath: string
  bundleIdentifier: string
}

export const utils = {
  getCurrentPath: (): Promise<string> => invokeServerUtils('system.getCurrentPath'),
  getSelectedPath: (): Promise<string[]> => invokeServerUtils('system.getSelectedPath'),
  getFrontmostApplication: (): Promise<IApplication | null> => invokeServerUtils('system.getFrontmostApplication'),
  runCommand: (command: string): Promise<string> => invokeServerUtils('system.runCommand', [command]),
  runAppleScript: (script: string): Promise<string> => invokeServerUtils('system.runAppleScript', [script]),
  open,
  getMousePosition: async () => {
    const [position, scaleFactor] = await Promise.all([cursorPosition(), getCurrentWindow().scaleFactor()]);
    return position.toLogical(scaleFactor);
  },
};

export const system = {
  autostart,
};

export const storage = {
  getItem(key: string): Promise<any | undefined> {
    return invokeServerUtils('storage.getItem', [key]);
  },
  setItem(key: string, value: any) {
    return invokeServerUtils('storage.setItem', [key, value]);
  },
  removeItem(key: string) {
    return invokeServerUtils('storage.removeItem', [key]);
  },
  allItems(keyPrefix: string) {
    return invokeServerUtils('storage.allItems', [keyPrefix]);
  },
  clear(keyPrefix: string) {
    return invokeServerUtils('storage.clear', [keyPrefix]);
  },
};

const pluginServerHost = 'http://localhost:2345';
export const registerServerModule = async (name: string, modulePath: string) => {
  const r = await fetch(`${pluginServerHost}/api/manager/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, modulePath }),
  });
  const json = await r.json();
  if (json.errCode !== 0) {
    throw new Error(`注册服务插件失败:${json.errMessage}`);
  }
  return json.data;
};

export const router = { pageEventSymbol, routerSymbol, onPageEnter, onPageLeave, useRouter };
