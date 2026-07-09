import { ref } from 'vue';
import { pinyin } from 'pinyin-pro';
import { appDataDir, join } from '@tauri-apps/api/path';
import { mkdir, remove, exists } from '@tauri-apps/plugin-fs';
import { download } from '@tauri-apps/plugin-upload';
import { storage, shell } from '@public-tauri/core';
import type { IStorePlugin } from '@/types/store';
import type { RaycastStoreExtension, RaycastStoreIndex } from '@/types/raycast-store';
import { publicPluginNpmNameForRaycastExtension } from '@/services/raycast-store';
import { isPluginRegistered, registerPlugin, unregisterPlugin } from '@/plugin/manager';
import { normalizePathForPrefix } from '@/utils';
import { STORAGE_KEY, STORE_URL, NPM_REGISTRY } from '@/const';

const installingPluginNames = ref<Set<string>>(new Set());
/** Raycast 商店扩展目录名（索引 `name`） */
const installingRaycastExtensionKeys = ref<Set<string>>(new Set());

const getPluginDirName = (npmPkg: string) => npmPkg;

export const isPluginInstalled = (name: string): boolean => isPluginRegistered(name);

export const isPluginInstalling = (name: string): boolean => installingPluginNames.value.has(name);

export const isRaycastExtensionInstalling = (extensionKey: string): boolean => installingRaycastExtensionKeys.value.has(extensionKey);

export const fetchStorePlugins = async (): Promise<IStorePlugin[]> => {
  const r = await fetch(STORE_URL);
  const json = await r.json();
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

const addStorePluginPath = async (pluginPath: string) => {
  const list: string[] = await storage.getItem(STORAGE_KEY.STORE_PLUGIN_PATH_LIST) || [];
  if (!list.includes(pluginPath)) {
    list.push(pluginPath);
    await storage.setItem(STORAGE_KEY.STORE_PLUGIN_PATH_LIST, list);
  }
};

const removeStorePluginPath = async (pluginPath: string) => {
  const list: string[] = await storage.getItem(STORAGE_KEY.STORE_PLUGIN_PATH_LIST) || [];
  const n = normalizePathForPrefix(pluginPath);
  await storage.setItem(STORAGE_KEY.STORE_PLUGIN_PATH_LIST, list.filter(p => normalizePathForPrefix(p) !== n));
};

export const getStorePluginPathList = async (): Promise<string[]> => (await storage.getItem(STORAGE_KEY.STORE_PLUGIN_PATH_LIST)) || [];

export const addRaycastPluginPath = async (pluginPath: string): Promise<void> => {
  const list: string[] = await storage.getItem(STORAGE_KEY.RAYCAST_PLUGIN_PATH_LIST) || [];
  const n = normalizePathForPrefix(pluginPath);
  if (list.some(p => normalizePathForPrefix(p) === n)) return;
  list.push(pluginPath);
  await storage.setItem(STORAGE_KEY.RAYCAST_PLUGIN_PATH_LIST, list);
};

export const removeRaycastPluginPath = async (pluginPath: string): Promise<void> => {
  const list: string[] = await storage.getItem(STORAGE_KEY.RAYCAST_PLUGIN_PATH_LIST) || [];
  const n = normalizePathForPrefix(pluginPath);
  await storage.setItem(STORAGE_KEY.RAYCAST_PLUGIN_PATH_LIST, list.filter(p => normalizePathForPrefix(p) !== n));
};

export const getRaycastPluginPathList = async (): Promise<string[]> => (await storage.getItem(STORAGE_KEY.RAYCAST_PLUGIN_PATH_LIST)) || [];

export const isPluginPathInRaycastList = async (pluginPath: string): Promise<boolean> => {
  if (!pluginPath) return false;
  const n = normalizePathForPrefix(pluginPath);
  const list: string[] = (await storage.getItem(STORAGE_KEY.RAYCAST_PLUGIN_PATH_LIST)) || [];
  return list.some(p => normalizePathForPrefix(p) === n);
};

export const isPluginPathInStoreList = async (pluginPath: string): Promise<boolean> => {
  if (!pluginPath) return false;
  const n = normalizePathForPrefix(pluginPath);
  const list: string[] = (await storage.getItem(STORAGE_KEY.STORE_PLUGIN_PATH_LIST)) || [];
  return list.some(p => normalizePathForPrefix(p) === n);
};

const NODE_SERVER_FETCH_EXTENSION_URL = 'http://127.0.0.1:2345/raycast/fetch-extension';
const NODE_SERVER_CONVERT_URL = 'http://127.0.0.1:2345/raycast/convert';

export const installRaycastStoreExtension = async (
  ext: RaycastStoreExtension,
  index: RaycastStoreIndex,
): Promise<void> => {
  const extKey = ext.name;
  if (installingRaycastExtensionKeys.value.has(extKey)) return;
  installingRaycastExtensionKeys.value.add(extKey);

  const publicNpm = publicPluginNpmNameForRaycastExtension(ext);
  const customDir = await getCustomPluginsDir();
  const dirName = getPluginDirName(publicNpm);
  const pluginDir = await join(customDir, dirName);

  const workRoot = await join(await appDataDir(), 'raycast-store-work', `${extKey}-${Date.now()}`);
  const sourceDir = await join(workRoot, 'source');

  try {
    if (await exists(pluginDir)) {
      await remove(pluginDir, { recursive: true });
    }

    await mkdir(workRoot, { recursive: true });
    await mkdir(sourceDir, { recursive: true });

    const fetchRes = await fetch(NODE_SERVER_FETCH_EXTENSION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: index.source.repo,
        commit: index.source.commit,
        sourcePath: ext.source.path,
        destDir: sourceDir,
      }),
    });
    const fetchPayload = await fetchRes.json().catch(() => ({})) as { ok?: boolean; error?: string };
    if (!fetchRes.ok || !fetchPayload.ok) {
      throw new Error(fetchPayload.error || `拉取 Raycast 扩展源码失败 HTTP ${fetchRes.status}`);
    }

    const res = await fetch(NODE_SERVER_CONVERT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputDir: sourceDir,
        outputDir: pluginDir,
        build: true,
      }),
    });
    const payload = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
    if (!res.ok || !payload.ok) {
      throw new Error(payload.error || `Raycast 转换失败 HTTP ${res.status}`);
    }

    await addRaycastPluginPath(pluginDir);
    const { registerPlugin } = await import('@/plugin/manager');
    try {
      await registerPlugin(pluginDir);
    } catch (regErr) {
      await removeRaycastPluginPath(pluginDir).catch(() => {});
      if (await exists(pluginDir)) {
        await remove(pluginDir, { recursive: true }).catch(() => {});
      }
      throw regErr;
    }
  } finally {
    installingRaycastExtensionKeys.value.delete(extKey);
    if (await exists(workRoot)) {
      await remove(workRoot, { recursive: true }).catch(() => {});
    }
  }
};

/** 卸载由 Raycast 商店安装的转换插件（目录位于应用 plugins 下，并从 raycastPluginPathList 移除） */
export const uninstallRaycastStorePlugin = async (publicNpmPackageName: string): Promise<void> => {
  const customDir = await getCustomPluginsDir();
  const pluginDir = await join(customDir, getPluginDirName(publicNpmPackageName));

  if (await exists(pluginDir)) {
    await remove(pluginDir, { recursive: true });
  }
  await removeRaycastPluginPath(pluginDir);

  const { unregisterPlugin } = await import('@/plugin/manager');
  unregisterPlugin(publicNpmPackageName);
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
    await registerPlugin(pluginDir);
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

  unregisterPlugin(pluginName);
};
