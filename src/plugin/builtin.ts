import type { ICommand, IPluginManifest, IPluginLifecycle } from '@public/schema';
import type { IRunningPlugin } from '@/types/plugin';
import { mainWindow } from '@public/core';

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
]);
