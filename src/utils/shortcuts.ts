import { register } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauri } from '@tauri-apps/api/core';

export const registerMainShortcut = () => {
  if (!isTauri()) return;
  return register('Command+Space', async () => {
    await getCurrentWindow().show();
    await getCurrentWindow().center();
  })
}