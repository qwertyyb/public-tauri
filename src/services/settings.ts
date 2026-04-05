import { register, unregister } from '@public-tauri/plugin-double-tap-shortcut';
import { storage, mainWindow } from '@public/core';
import { isTauri } from '@tauri-apps/api/core';
import { getPlugins as getAllPlugins } from '@/plugin/manager';
import type { ISettings } from '@/types/plugin';

const DEFAULT_SHORTCUT = 'Meta+Meta';

export const getSettings = async (): Promise<ISettings> => {
  const defaultSettings = {
    launchAtLogin: true,
    shortcuts: DEFAULT_SHORTCUT,
    clearTimeout: 90,
  };
  const settings = await storage.getItem('settings/settings') as ISettings;
  return {
    ...defaultSettings,
    ...settings,
  };
};

export const updateSettings = (settings: Partial<ISettings>) => storage.setItem('settings/settings', settings);

export const getPlugins = () => Promise.resolve([...getAllPlugins({ includeDisabledPlugins: true, includeDisabledCommands: true }).values() ?? []]).then(list => list.sort((prev, next) => prev.manifest.name.localeCompare(next.manifest.name)));

let last = DEFAULT_SHORTCUT;

export const registerMainShortcut = (shortcut: string) => {
  if (!isTauri()) return;
  last = shortcut;
  return register(shortcut, async () => {
    mainWindow.show();
    mainWindow.center();
  });
};

export const unregisterMainShortcut = () => {
  if (!isTauri()) return;
  return unregister(last);
};

export const updateMainShortcut = async (shortcut?: string) => {
  console.log('updateMainShortcut', shortcut);
  await unregisterMainShortcut();
  if (!shortcut?.trim()) return;
  await registerMainShortcut(shortcut);
};
