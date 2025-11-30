import type { ICommand, IPluginLifecycle, IPluginManifest } from '@public/schema';

export interface IRunningPlugin {
  plugin?: IPluginLifecycle
  path: string
  manifest: IPluginManifest
  commands: ICommand[]
  settings?: IPluginSettings
  lifecycle?: IPluginLifecycle
  entryUrl?: string
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
