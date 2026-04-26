import type * as coreApi from '@public/core';
import { CORE_API_KEY } from '@public/core/const';
import type { IPluginLifecycle, ICommand, IAction } from '@public/schema';
export type * from '@public/schema';

/** Actions for the host ActionBar in view-mode plugins: first entry is main (↵), the rest go to “more”. */
export type PluginShellAction = IAction & { action?: () => void };

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

export const { clipboard, dialog, mainWindow, fetch, utils, screen, WebviewWindow, Database, storage, showSaveFilePicker, fs, shell, opener, resolveFileIcon, resolveLocalPath, Webview, NativeWindow } = api;

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

export const updateCommands = (commands: ICommand[]): void => {
  if (isInWujie) {
    window.$wujie?.props?.updateCommands?.(commands);
    return;
  }
  throw new Error('updateCommands is not supported in current environment');
};

export const getPreferences = <T extends Record<string, any> = Record<string, any>>(): T => {
  if (isInWujie) {
    return (window.$wujie?.props?.getPreferences?.() || {}) as T;
  }
  throw new Error('getPreferences is not supported in current environment');
};

export const updateActions = (actions: PluginShellAction[]): void => {
  if (isInWujie) {
    window.$wujie?.props?.updateActions?.(actions);
    return;
  }
  throw new Error('setActions is not supported in current environment');
};

export const createPluginChannel: typeof coreApi.createPluginChannel = (pluginName) => {
  if (isInWujie) {
    return {
      invoke: <T = any>(name: string, ...args: any[]) => window.$wujie?.props?.invoke(name, ...args) as Promise<T>,
      on: window.$wujie?.props?.on,
    };
  }
  if (!isInWujie) {
    return api.createPluginChannel(pluginName);
  }
  throw new Error('createPluginChannel is not supported in current environment');
};

export const definePlugin = (options: (app: {
  updateCommands: (commands: ICommand[]) => void
  getPreferences: typeof getPreferences
}) => IPluginLifecycle) => options;

export const updateSearchBarValue = (value: string): void => {
  if (isInWujie) {
    window.$wujie?.props?.updateSearchBarValue?.(value);
    return;
  }
  throw new Error('updateSearchBarValue is not supported in current environment');
};

export const updateSearchBarVisible = (visible: boolean): void => {
  if (isInWujie) {
    window.$wujie?.props?.updateSearchBarVisible?.(visible);
    return;
  }
  throw new Error('updateSearchBarVisible is not supported in current environment');
};
