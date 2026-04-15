import { ref } from 'vue';
import { pinyin } from 'pinyin-pro';
import { appDataDir, join } from '@tauri-apps/api/path';
import { mkdir, remove, exists } from '@tauri-apps/plugin-fs';
import { download } from '@tauri-apps/plugin-upload';
import { storage, shell } from '@public/core';
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

const addCustomPluginPath = async (pluginPath: string) => {
  const list: string[] = await storage.getItem('customPluginPathList') || [];
  if (!list.includes(pluginPath)) {
    list.push(pluginPath);
    await storage.setItem('customPluginPathList', list);
  }
};

const removeCustomPluginPath = async (pluginPath: string) => {
  const list: string[] = await storage.getItem('customPluginPathList') || [];
  await storage.setItem('customPluginPathList', list.filter(p => p !== pluginPath));
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

  // 记录插件路径
  await addCustomPluginPath(pluginDir);

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
  await removeCustomPluginPath(pluginDir);

  const { unregisterPlugin } = await import('@/plugin/manager');
  unregisterPlugin(pluginName);
};

