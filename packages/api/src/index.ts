import type * as coreApi from '@public-tauri/core';
import { CORE_API_KEY } from '@public-tauri/core/const';
import type { IPluginLifecycle, ICommand, IAction } from '@public-tauri/schema';
export type * from '@public-tauri/schema';

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
const getChannel = (): coreApi.PluginChannel => {
  if (isInWujie && window.$wujie?.props?.channel) {
    return window.$wujie.props.channel;
  }
  throw new Error('channel is not supported in current environment');
};

export const { clipboard, dialog, mainWindow, fetch, utils, screen, WebviewWindow, Database, storage, showSaveFilePicker, fs, shell, opener, resolveFileIcon, resolveLocalPath, Webview, NativeWindow } = api;

export const channel: coreApi.PluginChannel = {
  invoke: (name, ...args) => getChannel().invoke(name, ...args),
  handle: (name, callback) => getChannel().handle(name, callback),
  emit: (event, ...args) => getChannel().emit(event, ...args),
  on: (event, callback) => getChannel().on(event, callback),
  once: (event, callback) => getChannel().once(event, callback),
  off: (event, callback) => getChannel().off(event, callback),
};

export const updateCommands = (commands: ICommand[]): void => {
  if (isInWujie) {
    window.$wujie?.props?.updateCommands?.(commands);
    return;
  }
  throw new Error('updateCommands is not supported in current environment');
};

export const updateCommand = (name: string, command: Partial<ICommand>): void => {
  if (isInWujie) {
    window.$wujie?.props?.updateCommand?.(name, command);
    return;
  }
  throw new Error('updateCommand is not supported in current environment');
};

export type LaunchCommandOptions = { pluginName?: string, commandName: string, query?: string, payload?: any };

export const launchCommand = (options: LaunchCommandOptions): void => {
  if (isInWujie) {
    window.$wujie?.props?.launchCommand?.(options);
    return;
  }
  throw new Error('launchCommand is not supported in current environment');
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

export const definePlugin = (options: (app: {
  updateCommands: (commands: ICommand[]) => void
  updateCommand: (name: string, command: Partial<ICommand>) => void
  launchCommand: (options: LaunchCommandOptions) => void
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

export const openPluginPreferences = (): void | Promise<void> => {
  if (isInWujie) {
    return window.$wujie?.props?.openPluginPreferences?.();
  }
  throw new Error('openPluginPreferences is not supported in current environment');
};

export const openCommandPreferences = (command: string): void | Promise<void> => {
  if (isInWujie) {
    return window.$wujie?.props?.openCommandPreferences?.(command);
  }
  throw new Error('openCommandPreferences is not supported in current environment');
};
