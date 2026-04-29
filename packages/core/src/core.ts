import * as clipboardBase from 'tauri-plugin-clipboard-api';
import { cursorPosition, getCurrentWindow } from '@tauri-apps/api/window';
import { invokeServerUtils } from './server';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export * as globalShortcut from '@tauri-apps/plugin-global-shortcut';
export { default as Database } from '@tauri-apps/plugin-sql';
export type { UnlistenFn } from '@tauri-apps/api/event';
export { WebviewWindow } from '@tauri-apps/api/webviewWindow';
export { Window as NativeWindow } from '@tauri-apps/api/window';
export { Webview } from '@tauri-apps/api/webview';

const listenMap = new WeakMap<Function, UnlistenFn>();
export const mainWindow = {
  hide() {
    return getCurrentWindow().hide();
  },
  show() {
    return getCurrentWindow().show();
  },
  center() {
    return getCurrentWindow().center();
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

export interface ScreenDetail {
  id: number
  name: number
  width: number
  height: number
  isBuiltin: boolean
  isPrimary: boolean
  x: number
  y: number
}

// tauri 自带的 monitor 方法没有返回 ID，截屏无法指定截哪个屏
export const screen = {
  getAllMonitors: () => invoke<ScreenDetail[]>('get_all_monitors'),
  capture: (monitorId?: number) => invoke<string>('capture', { monitorId }),
  monitorFromPoint: (x: number, y: number) => invoke<ScreenDetail>('monitor_from_point', { x: Math.round(x), y: Math.round(y) }),
  cursorMonitor: () => invoke<ScreenDetail>('cursor_monitor'),
  currentMonitor: () => invoke<ScreenDetail | null>('current_monitor'),
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

export type ClipboardApi = typeof clipboardBase & {
  paste: () => ReturnType<typeof invokeServerUtils>;
};

export const clipboard: ClipboardApi = {
  ...clipboardBase,
  paste: () => invokeServerUtils('keyboard.press', ['LeftCmd', 'V']),
};

export const fetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const { signal, headers: originHeaders, ...rest } = init || {};
  let headers: Record<string, string> = {};
  if (originHeaders && (originHeaders instanceof Headers)) {
    originHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else {
    headers = originHeaders as Record<string, string>;
  }
  const response = await invokeServerUtils('fetch', [input, { ...rest, headers }], { raw: true });
  if (signal?.aborted) {
    throw new Error('aborted');
  }
  return response;
};

export interface IApplication {
  name: string
  displayName: string
  executablePath: string
  bundleIdentifier: string
}

export interface IFrontmostApplication extends IApplication {
  pid: number
}

export const utils = {
  getCurrentPath: (): Promise<string> => invokeServerUtils('system.getCurrentPath'),
  getSelectedPath: (): Promise<string[]> => invokeServerUtils('system.getSelectedPath'),
  getSelectedText: (): Promise<string> => invokeServerUtils('system.getSelectedText'),
  getFrontmostApplication: (): Promise<IFrontmostApplication | null> => invoke('get_frontmost_application'),
  getDefaultApplication: (fileOrUrl: string): Promise<IApplication | null> => invoke('get_default_application', { fileOrUrl }),
  getApplications: (fileOrUrl: string): Promise<IApplication[]> => invoke('get_application', { fileOrUrl }),
  runCommand: (command: string): Promise<string> => invokeServerUtils('system.runCommand', [command]),
  runAppleScript: (script: string): Promise<string> => invokeServerUtils('system.runAppleScript', [script]),
  getMousePosition: async () => {
    const [position, scaleFactor] = await Promise.all([cursorPosition(), getCurrentWindow().scaleFactor()]);
    return position.toLogical(scaleFactor);
  },
};

/// Permission status types
export type PermissionStatus = 'granted' | 'denied' | 'unknown';

export interface PermissionsStatus {
  accessibility: PermissionStatus;
  appleScript: PermissionStatus;
  screenRecording: PermissionStatus;
}

/// Permission checking utilities
export const permissions = {
  /// Check all permissions status at once
  checkAll: (): Promise<PermissionsStatus> => invoke('check_permissions'),

  /// Check accessibility permission (for double-tap shortcut)
  checkAccessibility: (): Promise<PermissionStatus> => invoke('check_accessibility_permission'),

  /// Check AppleScript permission (for controlling other apps)
  checkAppleScript: (): Promise<PermissionStatus> => invoke('check_applescript_permission'),

  /// Check screen recording permission (for screen capture)
  checkScreenRecording: (): Promise<PermissionStatus> => invoke('check_screen_recording_permission'),

  /// Open Accessibility settings in System Preferences
  openAccessibilitySettings: (): Promise<void> => invoke('open_accessibility_settings'),

  /// Open Screen Recording settings in System Preferences
  openScreenRecordingSettings: (): Promise<void> => invoke('open_screen_recording_settings'),

  /// Open Automation settings in System Preferences
  openAutomationSettings: (): Promise<void> => invoke('open_automation_settings'),
};

