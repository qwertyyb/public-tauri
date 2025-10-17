import * as api from '@public/api/core';
import type { IPluginLifecycle } from '@public/types';

declare global {
  interface Window {
    $wujie?: {
      props?: { [key: string]: any }
    }
  }
}

export const clipboard: typeof api['clipboard'] = window.$wujie?.props?.clipboard;

export const storage: typeof api['storage'] = window.$wujie?.props?.storage;

export const dialog: typeof api['dialog'] = window.$wujie?.props?.dialog;

export const mainWindow: typeof api['mainWindow'] = window.$wujie?.props?.mainWindow;

export const fetch: typeof api['fetch'] = window.$wujie?.props?.fetch;

export const utils: typeof api['utils'] = window.$wujie?.props?.utils;

export const screen: typeof api['screen'] = window.$wujie?.props?.screen;

export const invoke: (name: string, ...args: any[]) => Promise<any> = window.$wujie?.props?.invoke;

export const on: ReturnType<typeof api['createPluginServerListener']> = window.$wujie?.props?.on;

export const createPlugin: (options: IPluginLifecycle) => void = window.$wujie?.props?.createPlugin;

export const Database: typeof api['Database'] = window.$wujie?.props?.Database;
