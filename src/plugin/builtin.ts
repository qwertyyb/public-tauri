import type { ICommand, IPluginManifest, IPluginLifecycle } from '@public/schema';
import type { IRunningPlugin } from '@/types/plugin';
import { dialog, mainWindow } from '@public/core';
import { registerPluginFromLocalPath } from '@/services/store';

// 定义内置插件的配置类型
export interface IBuiltinPlugin {
  name: string;
  manifest: IPluginManifest;
  commands: ICommand[];
  lifecycle?: IPluginLifecycle;
}

// 内置插件列表
export const BUILTIN_PLUGINS = new Map<string, IRunningPlugin>([
  [
    'settings',
    {
      path: '',
      manifest: {
        name: 'settings',
        title: 'Public设置',
        subtitle: 'Public应用设置',
        icon: '/settings.png',
      },
      commands: [
        {
          name: 'settings',
          title: 'Public设置',
          subtitle: 'Public应用设置',
          icon: '/settings.png',
          matches: [
            {
              type: 'text',
              keywords: [
                'public settings',
                'Public设置',
              ],
            },
          ],
          mode: 'none',
        },
      ],
      plugin: {
        onEnter: async (_command, query) => {
          mainWindow.pushView({
            path: '/settings',
            params: { query },
          });
        },
      },
    },
  ],
  [
    'store',
    {
      path: '',
      manifest: {
        name: 'store',
        title: '插件商店',
        subtitle: '浏览和安装插件',
        icon: 'store',
      },
      commands: [
        {
          name: 'store',
          title: '插件商店',
          subtitle: '浏览和安装插件',
          icon: 'store',
          matches: [
            {
              type: 'text',
              keywords: [
                'plugin store',
                '插件商店',
              ],
            },
          ],
          mode: 'none',
        },
      ],
      plugin: {
        onEnter: async () => {
          mainWindow.pushView({
            path: '/plugin/store',
          });
        },
      },
    },
  ],
  [
    'load-dev-plugin',
    {
      path: '',
      manifest: {
        name: 'load-dev-plugin',
        title: '加载开发插件',
        subtitle: '选择本地插件目录并动态加载',
        icon: 'folder_open',
      },
      commands: [
        {
          name: 'pick-folder',
          title: '加载开发插件',
          subtitle: '打开文件夹选择器，选择含 package.json 的插件根目录',
          icon: 'folder_open',
          matches: [
            {
              type: 'text',
              keywords: [
                '加载开发插件',
                'load dev plugin',
                'dev plugin',
                '本地插件',
              ],
            },
          ],
          mode: 'none',
        },
      ],
      plugin: {
        onEnter: async () => {
          const { open } = await import('@tauri-apps/plugin-dialog');
          const selected = await open({
            directory: true,
            multiple: false,
            recursive: true,
            title: '选择插件根目录（需含 package.json 与构建产物）',
          });
          if (selected === null) return;
          const dir = Array.isArray(selected) ? selected[0] : selected;
          try {
            await registerPluginFromLocalPath(dir);
            await dialog.showToast(`已加载: ${dir}`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await dialog.showToast(`加载失败: ${msg}`);
          }
        },
      },
    },
  ],
]);
