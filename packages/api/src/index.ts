import type * as coreApi from '@public/core';
import { CORE_API_KEY } from '@public/core/const';
import type { IPluginLifecycle, ICommand } from '@public/schema';
export type * from '@public/schema';

/** 判断是否在插件内，如果在插件内，就通过 wujie 调用，否则就从 core 调用 */

declare global {
  interface Window {
    $wujie?: {
      props?: { [key: string]: any }
    }
    IS_IN_WUJIE_ENV?: boolean
    [CORE_API_KEY]: typeof coreApi
  }
}

const isInWujie = !!window.$wujie;

const api: typeof coreApi = window.$wujie?.props as typeof coreApi || window[CORE_API_KEY];

console.log('api', api, window);

export const { clipboard, dialog, mainWindow, fetch, utils, screen, Database, storage, showSaveFilePicker, fs, resolveFileIcon, resolveLocalPath } = api;

export const invoke: <R extends any>(name: string, ...args: any[]) => Promise<R> = (name, ...args) => {
  if (isInWujie) {
    return window.$wujie?.props?.invoke(name, ...args);
  }
  throw new Error('invoke is not supported in current environment');
};

export const on: ReturnType<typeof coreApi.createPluginServerListener> = (event, callback) => {
  if (isInWujie) {
    return window.$wujie?.props?.on(event, callback);
  }
  throw new Error('on is not supported in current environment');
};

export const createPlugin: (options: IPluginLifecycle) => void = (options) => {
  if (isInWujie) {
    return window.$wujie?.props?.createPlugin(options);
  }
  throw new Error('createPlugin is not supported in current environment');
};

export const createPluginChannel: typeof coreApi.createPluginChannel = (pluginName) => {
  if (!isInWujie) {
    return api.createPluginChannel(pluginName);
  }
  throw new Error('createPluginChannel is not supported in current environment');
};

export const definePlugin = (options: (app: {
  updateCommands: (commands: ICommand[]) => void
}) => IPluginLifecycle) => options;
