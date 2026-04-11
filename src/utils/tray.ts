import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu } from '@tauri-apps/api/menu';
import { Image } from '@tauri-apps/api/image';
import { resolveResource } from '@tauri-apps/api/path';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { mainWindow } from '@public/core';

const menu = await Menu.new({
  items: [
    {
      id: 'toggle',
      text: '显示/隐藏',
      async action() {
        const visible = await getCurrentWindow().isVisible();
        if (visible) {
          getCurrentWindow().hide();
        } else {
          getCurrentWindow().show();
        }
      },
    },
    {
      id: 'settings',
      text: '设置',
      action() {
        mainWindow.pushView({ path: '/settings' });
        mainWindow.show();
      },
    },
    {
      text: 'separator-text',
      item: 'Separator',
    },
    {
      id: 'quit',
      text: '退出',
      item: 'Quit',
    },
    {
      id: 'checkUpdates',
      text: '检查更新...',
    },
    {
      id: 'about',
      text: '关于...',
      action() {
        mainWindow.pushView({ path: '/about' });
        mainWindow.show();
      },
    },
  ],
});

const options = {
  id: 'system',
  icon: await Image.fromPath(await resolveResource('icons/icon.ico')),
  menu,
  menuOnLeftClick: true,
  iconAsTemplate: true,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let tray: TrayIcon;

export const createTray = async () => {
  TrayIcon.removeById(options.id).catch(() => {});
  tray = await TrayIcon.new(options);
};
