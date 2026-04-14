import { ref } from 'vue';
import { pinyin } from 'pinyin-pro';
import type { IStorePlugin } from '@/types/store';

const STORE_URL = 'https://raw.githubusercontent.com/qwertyyb/public-tauri/refs/heads/master/store/index.json';

const installedPluginNames = ref<Set<string>>(new Set());

export const refreshInstalledPlugins = async () => {
  const { getPlugins } = await import('@/plugin/manager');
  const plugins = getPlugins({ includeDisabledPlugins: true, includeDisabledCommands: true });
  installedPluginNames.value = new Set(plugins.keys());
};

export const isPluginInstalled = (name: string): boolean => installedPluginNames.value.has(name);

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
