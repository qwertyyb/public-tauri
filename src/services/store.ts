import { ref } from 'vue';
import { pinyin } from 'pinyin-pro';
import { appDataDir, join } from '@tauri-apps/api/path';
import { mkdir, remove, exists } from '@tauri-apps/plugin-fs';
import { download } from '@tauri-apps/plugin-upload';
import { storage, shell } from '@public-tauri/core';
import type { IStorePlugin } from '@/types/store';

const STORE_URL = 'https://raw.githubusercontent.com/qwertyyb/public-tauri/refs/heads/master/store/index.json';

const NPM_REGISTRY = 'https://registry.npmjs.org';

const installedPluginNames = ref<Set<string>>(new Set());
const installingPluginNames = ref<Set<string>>(new Set());

const getPluginDirName = (npmPkg: string) => npmPkg;

export const refreshInstalledPlugins = async () => {
  const { getPlugins } = await import('@/plugin/manager');
  const plugins = getPlugins({ includeDisabledPlugins: true, includeDisabledCommands: true });
  installedPluginNames.value = new Set(plugins.keys());
};

export const isPluginInstalled = (name: string): boolean => installedPluginNames.value.has(name);

export const isPluginInstalling = (name: string): boolean => installingPluginNames.value.has(name);

export const fetchStorePlugins = async (): Promise<IStorePlugin[]> => {
  const r = await fetch(STORE_URL);
  const json = await r.json();
  console.log('json', json);
  return json.plugins;
};

export const searchPlugins = (plugins: IStorePlugin[], keyword: string): IStorePlugin[] => {
  if (!keyword.trim()) return plugins;
  const lower = keyword.toLowerCase();
  return plugins.filter((plugin) => {
    const fields = [plugin.manifest.title, plugin.manifest.subtitle, plugin.manifest.description, plugin.author, plugin.manifest.name];
    const textMatch = fields.some(field => field?.toLowerCase().includes(lower));
    if (textMatch) return true;
    const pinyinStr = fields.filter(Boolean).map(f => pinyin(f!, { toneType: 'none' }))
      .join(' ')
      .toLowerCase();
    return pinyinStr.includes(lower);
  });
};

export const getStore = () => fetchStorePlugins();

const getCustomPluginsDir = async () => {
  const appDir = await appDataDir();
  return join(appDir, 'plugins');
};

/** 商店下载并解压到的插件目录列表（Node storage key） */
export const STORE_PLUGIN_PATH_LIST_KEY = 'storePluginPathList';
/** 开发中「从本地目录加载」的插件路径列表（与商店分离，便于管理） */
export const DEV_PLUGIN_PATH_LIST_KEY = 'devPluginPathList';
/** 旧版单一列表，启动时迁移到上两者后删除 */
const LEGACY_CUSTOM_PLUGIN_PATH_LIST_KEY = 'customPluginPathList';

function normalizePathForPrefix(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

/** 将旧版 customPluginPathList 拆到商店 / 开发两个 key（按路径是否在应用 plugins 目录下区分） */
export const migratePluginPathListsFromLegacy = async (): Promise<void> => {
  const legacy: string[] | undefined = await storage.getItem(LEGACY_CUSTOM_PLUGIN_PATH_LIST_KEY);
  if (!legacy?.length) return;

  const customDir = await getCustomPluginsDir();
  const base = normalizePathForPrefix(customDir);

  const storePaths: string[] = (await storage.getItem(STORE_PLUGIN_PATH_LIST_KEY)) || [];
  const devPaths: string[] = (await storage.getItem(DEV_PLUGIN_PATH_LIST_KEY)) || [];

  for (const p of legacy) {
    const np = normalizePathForPrefix(p);
    const underStoreDir = np === base || np.startsWith(`${base}/`);
    if (underStoreDir) {
      if (!storePaths.includes(p)) storePaths.push(p);
    } else if (!devPaths.includes(p)) {
      devPaths.push(p);
    }
  }

  await storage.setItem(STORE_PLUGIN_PATH_LIST_KEY, storePaths);
  await storage.setItem(DEV_PLUGIN_PATH_LIST_KEY, devPaths);
  await storage.removeItem(LEGACY_CUSTOM_PLUGIN_PATH_LIST_KEY);
};

const addStorePluginPath = async (pluginPath: string) => {
  const list: string[] = await storage.getItem(STORE_PLUGIN_PATH_LIST_KEY) || [];
  if (!list.includes(pluginPath)) {
    list.push(pluginPath);
    await storage.setItem(STORE_PLUGIN_PATH_LIST_KEY, list);
  }
};

const removeStorePluginPath = async (pluginPath: string) => {
  const list: string[] = await storage.getItem(STORE_PLUGIN_PATH_LIST_KEY) || [];
  const n = normalizePathForPrefix(pluginPath);
  await storage.setItem(STORE_PLUGIN_PATH_LIST_KEY, list.filter(p => normalizePathForPrefix(p) !== n));
};

const addDevPluginPath = async (pluginPath: string) => {
  const list: string[] = await storage.getItem(DEV_PLUGIN_PATH_LIST_KEY) || [];
  if (list.some(p => normalizePathForPrefix(p) === normalizePathForPrefix(pluginPath))) return;
  list.push(pluginPath);
  await storage.setItem(DEV_PLUGIN_PATH_LIST_KEY, list);
};

export const removeDevPluginPath = async (pluginPath: string) => {
  const list: string[] = await storage.getItem(DEV_PLUGIN_PATH_LIST_KEY) || [];
  const n = normalizePathForPrefix(pluginPath);
  await storage.setItem(DEV_PLUGIN_PATH_LIST_KEY, list.filter(p => normalizePathForPrefix(p) !== n));
};

export const getDevPluginPathList = async (): Promise<string[]> => (await storage.getItem(DEV_PLUGIN_PATH_LIST_KEY)) || [];

export const getStorePluginPathList = async (): Promise<string[]> => (await storage.getItem(STORE_PLUGIN_PATH_LIST_KEY)) || [];

export const isPluginPathInDevList = async (pluginPath: string): Promise<boolean> => {
  if (!pluginPath) return false;
  const n = normalizePathForPrefix(pluginPath);
  const list: string[] = (await storage.getItem(DEV_PLUGIN_PATH_LIST_KEY)) || [];
  return list.some(p => normalizePathForPrefix(p) === n);
};

export const isPluginPathInStoreList = async (pluginPath: string): Promise<boolean> => {
  if (!pluginPath) return false;
  const n = normalizePathForPrefix(pluginPath);
  const list: string[] = (await storage.getItem(STORE_PLUGIN_PATH_LIST_KEY)) || [];
  return list.some(p => normalizePathForPrefix(p) === n);
};

/**
 * 从 devPluginPathList 中移除、并从内存中卸载（不删除源目录文件）
 */
export const unregisterDevPluginFromLocalPath = async (pluginPath: string): Promise<void> => {
  const { getPlugins, unregisterPlugin } = await import('@/plugin/manager');
  const n = normalizePathForPrefix(pluginPath);
  const all = getPlugins({ includeDisabledPlugins: true, includeDisabledCommands: true });
  for (const [name, p] of all) {
    if (normalizePathForPrefix(p.path) === n) {
      unregisterPlugin(name);
      break;
    }
  }
  await removeDevPluginPath(pluginPath);
  await refreshInstalledPlugins();
  void import('@/plugin/devPluginHotReload').then(m => m.syncDevPluginFileWatchers());
};

export const getDevPluginPaths = async (): Promise<string[]> => {
  return (await storage.getItem(DEV_PLUGIN_PATH_LIST_KEY)) || [];
};

export const unloadDevPlugin = async (pluginPath: string, pluginName: string): Promise<void> => {
  const { unregisterPlugin } = await import('@/plugin/manager');
  unregisterPlugin(pluginName);
  await removeDevPluginPath(pluginPath);
  await refreshInstalledPlugins();
};

/**
 * 从任意本地目录加载插件（写入 devPluginPathList，与商店安装的 storePluginPathList 分开）
 */
export const registerPluginFromLocalPath = async (pluginPath: string): Promise<void> => {
  const { registerPlugin, isPluginPathRegistered } = await import('@/plugin/manager');
  if (isPluginPathRegistered(pluginPath)) {
    throw new Error('该目录对应插件已加载');
  }
  const devPaths: string[] = (await storage.getItem(DEV_PLUGIN_PATH_LIST_KEY)) || [];
  const n = normalizePathForPrefix(pluginPath);
  if (devPaths.some(p => normalizePathForPrefix(p) === n)) {
    throw new Error('该目录已在开发插件列表中');
  }
  await addDevPluginPath(pluginPath);
  try {
    await registerPlugin(pluginPath);
  } catch (e) {
    await removeDevPluginPath(pluginPath);
    throw e;
  }
  await refreshInstalledPlugins();
  void import('@/plugin/devPluginHotReload').then(m => m.syncDevPluginFileWatchers());
};

export const installStorePlugin = async (plugin: IStorePlugin): Promise<void> => {
  const npmPkg = plugin.name;
  if (installingPluginNames.value.has(npmPkg)) return;
  installingPluginNames.value.add(npmPkg);

  try {
    const customDir = await getCustomPluginsDir();
    const dirName = getPluginDirName(npmPkg);
    const pluginDir = await join(customDir, dirName);
    const tgzPath = await join(customDir, `${dirName}.tgz`);

    // 如果已经存在，先删除
    if (await exists(pluginDir)) {
      await remove(pluginDir, { recursive: true });
    }
    await mkdir(pluginDir, { recursive: true });

    // 获取 npm tarball 信息
    const metadataUrl = `${NPM_REGISTRY}/${encodeURIComponent(npmPkg)}`;
    const metadataRes = await fetch(metadataUrl);
    const metadata = await metadataRes.json();
    const dist = metadata.versions?.[metadata['dist-tags']?.latest || plugin.version]?.dist;
    if (!dist?.tarball) {
      throw new Error(`找不到 ${npmPkg} 的 tarball 地址`);
    }

    // 使用 plugin-upload 下载 tarball 到本地
    await download(dist.tarball, tgzPath);

    // 使用 tar 命令解压到插件目录（--strip-components=1 去掉 npm 的 package/ 前缀）
    const tarCommand = shell.Command.create('tar', ['-xzf', tgzPath, '-C', pluginDir, '--strip-components=1']);
    await tarCommand.execute();

    // 清理 tgz 文件
    if (await exists(tgzPath)) {
      await remove(tgzPath);
    }

    // 记录插件路径（商店安装）
    await addStorePluginPath(pluginDir);

    // 注册插件
    const { registerPlugin } = await import('@/plugin/manager');
    await registerPlugin(pluginDir);

    installedPluginNames.value.add(npmPkg);
  } finally {
    installingPluginNames.value.delete(npmPkg);
  }
};

export const uninstallStorePlugin = async (pluginName: string): Promise<void> => {
  const customDir = await getCustomPluginsDir();
  const pluginDir = await join(customDir, pluginName);

  if (await exists(pluginDir)) {
    await remove(pluginDir, { recursive: true });
  }
  await removeStorePluginPath(pluginDir);

  const { unregisterPlugin } = await import('@/plugin/manager');
  unregisterPlugin(pluginName);
  await refreshInstalledPlugins();
};

