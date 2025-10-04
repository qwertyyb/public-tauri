import { useRouter, onPageEnter, onPageLeave } from './router';
import { invokePluginServerMethod } from './utils';
import { io } from 'https://unpkg.com/socket.io@4.8.1/client-dist/socket.io.esm.min.js';
export type { IListViewCommand, IPlugin, IPluginCommand as ICommand } from '@public/types';
export { clipboard, dialog, mainWindow, fetch, utils, screen, Database } from './core';

const createPluginStorage = (name: string) => {
  const getKey = (key: string) => `${name}:${key}`;
  return {
    getItem(key: string) {
      return CoreStorage.getItem(getKey(key));
    },
    setItem(key: string, value: any) {
      return CoreStorage.setItem(getKey(key), value);
    },
    allItems() {
      return CoreStorage.allItems(`${name}:`);
    },
    clear(keyPrefix?: string) {
      return CoreStorage.clear(`${name}:`);
    },
    removeItem(key: string) {
      return CoreStorage.removeItem(getKey(key));
    },
  };
};

const pluginName = process.env.PLUGIN_NAME;

if (!pluginName) {
  throw new Error('PLUGIN_NAME is not defined');
}

export const invoke = async <T>(method: string, ...args: any[]): Promise<T> => invokePluginServerMethod(pluginName, method, args);

const socket = io('http://localhost:2345', {
  path: '/socket.io',
  query: {
    name: pluginName,
  },
});
export const on = (event: string, callback: (data: any) => void) => {
  socket.on(event, callback);
};

export const storage = createPluginStorage(pluginName);

export const router = { useRouter, onPageEnter, onPageLeave };
