import * as clipboardBase from 'tauri-plugin-clipboard-api'
export * as globalShortcut from '@tauri-apps/plugin-global-shortcut'
import { getCurrentWindow } from "@tauri-apps/api/window"
import * as autostart from '@tauri-apps/plugin-autostart'
import { invokeServerUtils } from './utils'
import { useRouter, onPageEnter, onPageLeave, pageEventSymbol, routerSymbol } from './router'
import { listen, UnlistenFn } from '@tauri-apps/api/event'

const listenMap = new WeakMap<Function, UnlistenFn>()
export const mainWindow = {
  hide() {
    return getCurrentWindow().hide()
  },
  show() {
    return getCurrentWindow().show()
  },
  clearInput() {
    window.dispatchEvent(new CustomEvent('clearInput'))
  },
  popToRoot(options?: { clearInput?: boolean }) {
    window.dispatchEvent(new CustomEvent('pop-to-root', { detail: { ...options } }))
  },
  pushView: (options: { path: string, params?: any }) => {
    return window.dispatchEvent(new CustomEvent('push-view', { detail: { ...options }}))
  },
  popView: (options: { count: number } = { count: 1}) => {
    return window.dispatchEvent(new CustomEvent('pop-view', { detail: { ...options }}))
  },
  onShow: async (callback: () => void) => {
    const unlisten = await listen('focus', (event) => {
      if (event.payload) {
        callback()
      }
    })
    listenMap.set(callback, unlisten)
  },
  offShow: (callback: () => void) => {
    listenMap.get(callback)?.()
  }
}

export const dialog = {
  showAlert(message: string, title?: string, options?: { type: 'info' | 'warning' | 'error', confirmText: string }) {
    return new Promise<void>(resolve => {
      window.dispatchEvent(new CustomEvent('app:showAlert', { detail: { options: { message, title, ...options, onConfirm: resolve } } }))
    })
  },
  showConfirm(message: string, title?: string, options?: { type: 'info' | 'warning' | 'error', confirmText: string, cancelText: string }) {
    return new Promise<void>((resolve, reject) => {
      window.dispatchEvent(new CustomEvent('app:showConfirm', { detail: { options: { message, title, ...options, onConfirm: resolve, onCancel: () => reject('cancel') } } }))
    })
  },
  showToast(message: string, options?: { duration: number, icon: string }) {
    return new Promise<void>(resolve => {
      window.dispatchEvent(new CustomEvent('app:showToast', { detail: { options: { message, ...options, done: resolve } } }))
    })
  }
}

export const clipboard = {
  ...clipboardBase,
  paste: () => invokeServerUtils('keyboard.press', ['LeftCmd', 'V'])
}

export const fetch = (...args: Parameters<typeof window.fetch>): Promise<Response> => {
  return invokeServerUtils('fetch', args, { raw: true })
}

interface IApplication {
  displayName: string
  executablePath: string
  bundleIdentifier: string
}

export const utils = {
  getCurrentPath: (): Promise<string> => {
    return invokeServerUtils('system.getCurrentPath')
  },
  getSelectedPath: (): Promise<string[]> => {
    return invokeServerUtils('system.getSelectedPath')
  },
  getFrontmostApplication: (): Promise<IApplication | null> => {
    return invokeServerUtils('system.getFrontmostApplication')
  },
  runCommand: (command: string): Promise<string> => {
    return invokeServerUtils('system.runCommand', [command])
  },
  runAppleScript: (script: string): Promise<string> => {
    return invokeServerUtils('system.runAppleScript', [script])
  }
}

export const system = {
  autostart
}

export const storage = {
  getItem(key: string): Promise<any | undefined> {
    return invokeServerUtils('storage.getItem', [key])
  },
  setItem(key: string, value: any) {
    return invokeServerUtils('storage.setItem', [key, value])
  },
  removeItem(key: string) {
    return invokeServerUtils('storage.removeItem', [key])
  },
  allItems(keyPrefix: string) {
    return invokeServerUtils(`storage.allItems`, [keyPrefix])
  },
  clear(keyPrefix: string) {
    return invokeServerUtils('storage.clear', [keyPrefix])
  }
}

export const pluginServerHost = 'http://localhost:2345'
export const registerServerModule = async (name: string, modulePath: string) => {
  const r = await fetch(`${pluginServerHost}/api/manager/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, modulePath })
  })
  const json = await r.json()
  if (json.errCode !== 0) {
    throw new Error(`注册服务插件失败:${json.errMessage}`)
  }
  return json.data
}

export const router = { pageEventSymbol, routerSymbol, onPageEnter, onPageLeave, useRouter }
