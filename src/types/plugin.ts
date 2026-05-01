import type { ICommand, IPluginLifecycle, IPluginManifest } from '@public-tauri/schema';

export interface IRunningPlugin {
  plugin?: IPluginLifecycle
  path: string
  manifest: IPluginManifest
  commands: ICommand[]
  settings?: IPluginSettings
  entryUrl?: string
  events?: EventTarget
}

export interface ISettings {
  launchAtLogin: boolean,
  shortcuts: string,
  clearTimeout: number,
}

export interface ICommandSettings {
  alias?: string
  shortcut?: string
  disabled?: boolean
  preferences?: Record<string, any>
}

export interface IPluginSettings {
  disabled?: boolean,
  commands: Record<string, ICommandSettings | undefined>,
  preferences?: Record<string, string | number | boolean>
}

export type IPluginsSettings = Record<string, IPluginSettings | undefined>;

export interface ActionPanelAction {
  name: string;
  icon?: string;
  title?: string;
  styleType?: 'default' | 'warning' | 'danger';
  action?: () => void;
}
