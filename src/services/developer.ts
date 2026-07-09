import { STORAGE_KEY } from '@/const';
import { isPluginPathRegistered, registerPlugin, reloadPlugin, unregisterPluginByPath } from '@/plugin/manager';
import type { IRunningPlugin } from '@/types/plugin';
import { normalizePathForPrefix } from '@/utils';
import { storage } from '@public-tauri/core';

const addDevPluginPath = async (pluginPath: string) => {
  const list: string[] = await storage.getItem(STORAGE_KEY.DEV_PLUGIN_PATH_LIST) || [];
  if (list.some(p => normalizePathForPrefix(p) === normalizePathForPrefix(pluginPath))) return;
  list.push(pluginPath);
  await storage.setItem(STORAGE_KEY.DEV_PLUGIN_PATH_LIST, list);
};

const removeDevPluginPath = async (pluginPath: string) => {
  const list: string[] = await storage.getItem(STORAGE_KEY.DEV_PLUGIN_PATH_LIST) || [];
  const n = normalizePathForPrefix(pluginPath);
  await storage.setItem(STORAGE_KEY.DEV_PLUGIN_PATH_LIST, list.filter(p => normalizePathForPrefix(p) !== n));
};

export const getDevPluginPathList = async (): Promise<string[]> => (await storage.getItem(STORAGE_KEY.DEV_PLUGIN_PATH_LIST)) || [];

/**
 * 从 devPluginPathList 中移除、并从内存中卸载（不删除源目录文件）
 */
export const uninstallDevPlugin = async (pluginPath: string): Promise<void> => {
  if (!isPluginPathRegistered(pluginPath)) {
    throw new Error('该目录对应插件未加载');
  }
  unregisterPluginByPath(pluginPath);
  await removeDevPluginPath(pluginPath);
};

export const getDevPluginPaths = async (): Promise<string[]> => (await storage.getItem(STORAGE_KEY.DEV_PLUGIN_PATH_LIST)) || [];

export const isPluginPathInDevList = async (pluginPath: string): Promise<boolean> => {
  if (!pluginPath) return false;
  const n = normalizePathForPrefix(pluginPath);
  const list: string[] = (await storage.getItem(STORAGE_KEY.DEV_PLUGIN_PATH_LIST)) || [];
  return list.some(p => normalizePathForPrefix(p) === n);
};

/**
   * 从任意本地目录加载插件（写入 devPluginPathList，与商店安装的 storePluginPathList 分开）
   */
export const installDevPlugin = async (pluginPath: string, options: { reload?: boolean } = {}) => {
  if (isPluginPathRegistered(pluginPath) && !options.reload) {
    throw new Error('该目录对应插件已加载，如需重新加载，请使用 reload 选项');
  }
  let plugin: IRunningPlugin | undefined;
  try {
    if (options.reload) {
      plugin = await reloadPlugin(pluginPath);
    } else {
      plugin = await registerPlugin(pluginPath);
    }
  } catch (e) {
    await removeDevPluginPath(pluginPath);
    throw e;
  }
  await addDevPluginPath(pluginPath);
  return plugin;
};
