import { getCurrentWindow } from '@tauri-apps/api/window'
import * as clipboard from '@tauri-apps/plugin-clipboard-manager'

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

const createPluginAPI = (name: string) => {
  return {
    clipboard,
    window: {
      hide() {
        getCurrentWindow().hide()
      },
      show() {
        getCurrentWindow().show()
      },
      clearInput() {
        window.dispatchEvent(new CustomEvent('clearInput'))
      },
      popToRoot(options?: { clearInput?: boolean }) {
        window.dispatchEvent(new CustomEvent('pop-to-root', { detail: { ...options } }))
      },
    },
    invoke: async (method: string, ...args: any[]) => {
      return invokeServer(name, method, args)
    },
    on: (event: string, callback: (data: any) => void) => {
    },
  }
}

const api = createPluginAPI((process.env as any).PUBLIC_PLUGIN_NAME)

export default api