import { getCurrentWindow } from '@tauri-apps/api/window'
import { readText, readHtml, readFiles, readImageBinary, writeHtml, writeText, writeImageBinary, writeFiles } from 'tauri-plugin-clipboard-api'
import { ask, confirm, message } from '@tauri-apps/plugin-dialog'

const invokeServer = async (name: string, method: string, args: any[]) => {
  const r = await fetch('http://127.0.0.1:2345/api/manager/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, method, args})
  })
  const { data } = await r.json()
  return data
}

const invokeServerUtils = async (method: string, args: any[], options = { raw: false }) => {
  const r = await fetch('http://127.0.0.1:2345/utils/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ method, args })
  })
  if (options.raw) {
    return r
  }
  const { data } = await r.json()
  return data
}

export const createPluginAPI = (name: string) => {
  return {
    clipboard: {
      readText, readHtml, readFiles, readImage: readImageBinary,
      writeText, writeHtml, writeFiles, writeImage: writeImageBinary,
      paste: () => invokeServerUtils('keyboard.press', ['LeftCmd', 'V'])
    },
    window: {
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
    },
    dialog: {
      alert(msg: string, title?: string, options?: { type: 'info' | 'warning' | 'error', confirmText: string }) {
        return message(msg, {
          title,
          kind: options.type,
          okLabel: options.confirmText
        })
      },
      confirm(msg: string, title?: string, options?: { type: 'info' | 'warning' | 'error', confirmText: string, cancelText: string }) {
        return confirm(msg, {
          title,
          kind: options.type,
          okLabel: options.confirmText,
          cancelLabel: options.cancelText
        })
      },
      toast() {

      }
    },

    fetch: (...args: Parameters<typeof fetch>): Promise<Response> => {
      return invokeServerUtils('fetch', args, { raw: true })
    },
    invoke: async (method: string, ...args: any[]): Promise<Response> => {
      return invokeServer(name, method, args)
    },
    on: (event: string, callback: (data: any) => void) => {
    },
  }
}

const api = createPluginAPI('test')

// @ts-ignore
window.api = api

export default api