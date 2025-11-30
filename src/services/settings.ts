import { storage } from '@public/api/storage';
import { getPlugins as getAllPlugins } from '@/plugin/manager';
import type { ISettings } from '@/types/plugin';

export const getSettings = async (): Promise<ISettings> => {
  const defaultSettings = {
    launchAtLogin: true,
    shortcuts: 'Meta+Meta',
    clearTimeout: 90,
  };
  const settings = await storage.getItem('settings/settings') as ISettings;
  return {
    ...defaultSettings,
    ...settings,
  };
};

export const updateSettings = (settings: Partial<ISettings>) => {
  storage.setItem('settings/settings', settings);
};

export const getPlugins = () => Promise.resolve([...getAllPlugins({ includeDisabledPlugins: true, includeDisabledCommands: true }).values() ?? []]).then(list => list.sort((prev, next) => prev.manifest.name.localeCompare(next.manifest.name)));

// export const updatePluginSettings = (plugin: string, settings: Partial<Omit<IPluginSettings, 'commands'>>) => {
//   updatePluginSettings(plugin, settings);
// }

// export const updateCommandSettings = (plugin: string, command: string, settings: ICommandSettings) => window.pluginManager?.updateCommandSettings(plugin, command, settings)

// export const removePlugin = (plugin: string) => window.pluginManager?.unregisterPlugin(plugin)

// export const openPreferences = (plugin: string, command?: string) => window.publicApp.plugin.openPreferences(plugin, command)

// export const unregisterShortcuts = (shortcuts: string) => {
//   window.PublicApp.mainAPI.shortcuts.unregister(shortcuts)
// }

// export const registerCommandShortcuts = (shortcuts: string, plugin: string, command: string) => {
//   // 需要处理快捷键
//   window.PublicApp.mainAPI.shortcuts.register(shortcuts, () => {
//     window.PublicApp.mainAPI.plugin.enterCommand(plugin, command, { from: 'hotkey', keyword: '', query: '', score: 0 })
//     window.PublicApp.mainAPI.mainWindow.show()
//   })
// }
