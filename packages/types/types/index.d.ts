import { IPublicAppMainAPI } from './api';
import { IActionItem, ICommandSettings, IPluginCommand, IPluginSettings, IPluginsSettings, IRunningPlugin } from './plugin';

export * from './plugin';
export * from './utils';
export * from './api';

export interface IWebviewProps {
  src: string, preload?: string, nodeintegration?: boolean, nodeintegrationinsubframes?: boolean, httpreferrer?: string, useragent?: string, disablewebsecurity?: boolean, webpreferences?: string
}

export interface IBridge {
  invoke: <R extends any>(method, ...args: any[]) => Promise<R>,
  handle: (channel: string, callback: (...args: any[]) => any) => void,
  unhandle: (channel: string) => void,
}

export interface IPluginManager {
  getPlugins: (options?: { includeDisabledPlugins?: boolean, includeDisabledCommand?: boolean }) => Map<string, IRunningPlugin>,
  getPlugin: (name: string) => IRunningPlugin | undefined
  unregisterPlugin: (name: string) => void,
  registerPlugin: (path: string) => void,

  disablePlugin: (name: string, disabled: boolean) => void,
  disablePluginCommand: (name: string, commandName: string, disabled: boolean) => void,

  updatePluginsSettings: (value: IPluginsSettings) => void
  updatePluginSettings: (name: string, settings: Omit<IPluginSettings, 'commands'>) => void
  updatePluginPreferences: (name: string, prfs: Record<string, any>) => void

  getPluginPreferences: (name: string) => Record<string, any>
  updateCommandPreferences: (pluginName: string, commandName: string, prfs: Record<string, any>) => void
  getCommandPreferences: (pluginName: string, commandName: string) => Record<string, any>
  updateCommandSettings: (pluginName: string, commandName: string, settings: ICommandSettings) => void

  handleQuery: (keyword: string) => Promise<IPluginCommand[]>,
  handleEnter: (command: IPluginCommand) => void,
  handleAction: (command: IPluginCommand, action: IActionItem, keyword: string) => void,
  handleSelect: (command: IPluginCommand, keyword: string) => string | HTMLElement | Promise<string | HTMLElement | undefined> | undefined,
}

export interface ISettings {
  launchAtLogin: boolean,
  shortcuts: string,
  clearTimeout: number,
}

declare global {
  interface Window {
    PublicAppBridge?: {
      invoke<R>(method: string, ...args: unknown[]): Promise<R>;
      handle(channel: string, callback: (...args: any[]) => any): void;
      unhandle(channel: string): void;
    };
  }

  interface WindowEventMap {
    'publicApp.shortcuts': CustomEvent<{ shortcuts: string }>,
  }
}
