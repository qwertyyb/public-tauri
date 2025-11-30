import * as core from './core';
import type { IPluginLifecycle } from '@public/schema';
import { storage as baseStorage } from './storage';
import { createPluginChannel as baseCreatePluginChannel, type createPluginServerListener } from './utils';
export * from '@public/schema';

/** 判断是否在插件内，如果在插件内，就通过 wujie 调用，否则就从 core 调用 */

declare global {
  interface Window {
    $wujie?: {
      props?: { [key: string]: any }
    }
  }
}

const isInWujie = !!window.$wujie;

export const clipboard: typeof core.clipboard = isInWujie ? window.$wujie?.props?.clipboard : core.clipboard;

export const storage: typeof baseStorage = isInWujie ? window.$wujie?.props?.storage : baseStorage;

export const dialog: typeof core.dialog = isInWujie ? window.$wujie?.props?.dialog : core.dialog;

export const mainWindow: typeof core.mainWindow = isInWujie ? window.$wujie?.props?.mainWindow : core.mainWindow;

export const fetch: typeof core.fetch = isInWujie ? window.$wujie?.props?.fetch : core.fetch;

export const utils: typeof core.utils = isInWujie ? window.$wujie?.props?.utils : core.utils;

export const screen: typeof core.screen = isInWujie ? window.$wujie?.props?.screen : core.screen;

export const invoke: <R extends any>(name: string, ...args: any[]) => Promise<R> = (name, ...args) => {
  if (isInWujie) {
    return window.$wujie?.props?.invoke(name, ...args);
  }
  throw new Error('invoke is not supported in current environment');
};

export const on: ReturnType<typeof createPluginServerListener> = (event, callback) => {
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

export const Database: typeof core.Database = isInWujie ? window.$wujie?.props?.Database : core.Database;

export const createPluginChannel: typeof baseCreatePluginChannel = (pluginName) => {
  if (!isInWujie) {
    return baseCreatePluginChannel(pluginName);
  }
  throw new Error('createPluginChannel is not supported in current environment');
};
