import { IListViewCommand, IPlugin, IPluginCommand as ICommand } from '@public/types'
import { clipboard as coreClipboard, dialog as coreDialog, mainWindow as coreMainWindow, fetch as coreFetch, storage as CoreStorage } from './core'
import { useRouter, onPageEnter, onPageLeave } from './router'
import { invokePluginServerMethod } from './utils'
import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";

export type { IListViewCommand, IPlugin, ICommand }

const createPluginStorage = (name: string) => {
  const getKey = (key: string) => `${name}:${key}`
  return {
    getItem(key: string) {
      return CoreStorage.getItem(getKey(key))
    },
    setItem(key: string, value: any) {
      return CoreStorage.setItem(getKey(key), value)
    },
    allItems() {
      return CoreStorage.allItems(`${name}:`)
    },
    clear(keyPrefix?: string) {
      return CoreStorage.clear(`${name}:`)
    },
    removeItem(key: string) {
      return CoreStorage.removeItem(getKey(key))
    }
  }
}

export const createPluginAPI = (name: string) => {
  const socket = io('http://localhost:2345', {
    path: '/socket.io',
    query: {
      name
    }
  })
  return {
    clipboard: coreClipboard,
    mainWindow: coreMainWindow,
    dialog: coreDialog,

    fetch: coreFetch,

    invoke: async (method: string, ...args: any[]): Promise<Response> => {
      return invokePluginServerMethod(name, method, args)
    },
    on: (event: string, callback: (data: any) => void) => {
      socket.on(event, callback)
    },
  }
}

const pluginName = process.env.PLUGIN_NAME

if (!pluginName) {
  throw new Error(`PLUGIN_NAME is not defined`)
}

const { clipboard, mainWindow, dialog, fetch, invoke, on } = createPluginAPI(pluginName)

export {
  clipboard,
  mainWindow, dialog, fetch, invoke, on,
}

export const storage = createPluginStorage(pluginName)

export const router = { useRouter, onPageEnter, onPageLeave }