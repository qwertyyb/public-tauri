import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu } from '@tauri-apps/api/menu';
import { Image } from '@tauri-apps/api/image';
import { resolveResource } from '@tauri-apps/api/path';
import { getCurrentWindow } from '@tauri-apps/api/window';

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
      text: 'separator-text',
      item: 'Separator',
    },
    {
      id: 'settings',
      text: '设置',
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

let tray: TrayIcon;

export const createTray = async () => {
  TrayIcon.removeById(options.id).catch(() => {})
  tray = await TrayIcon.new(options);
};
