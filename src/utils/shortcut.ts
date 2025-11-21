import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauri } from '@tauri-apps/api/core';

let last = 'Command+Space';

export const registerMainShortcut = (shortcut: string) => {
  if (!isTauri()) return;
  last = shortcut;
  return register(shortcut, async () => {
    getCurrentWindow().listen('tauri://close-requested', () => {
      console.log('close requested');
    });
    await getCurrentWindow().show();
    await getCurrentWindow().center();
  });
};

export const unregisterMainShortcut = () => {
  if (!isTauri()) return;
  return unregister(last);
};

export const updateMainShortcut = async (shortcut: string) => {
  await unregisterMainShortcut();
  await registerMainShortcut(shortcut);
};

if (import.meta.hot) {
  unregister('Command+Space');
  import.meta.hot.accept();
}

window.addEventListener('unload', () => {
  unregister('Command+Space');
});
