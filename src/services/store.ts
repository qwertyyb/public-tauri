import { ref } from 'vue';
import { pinyin } from 'pinyin-pro';
import { mockStore } from '@/mock/store';
import type { IStorePlugin } from '@/types/store';

const installedPluginNames = ref<Set<string>>(new Set());

export const refreshInstalledPlugins = async () => {
  const { getPlugins } = await import('@/plugin/manager');
  const plugins = getPlugins({ includeDisabledPlugins: true, includeDisabledCommands: true });
  installedPluginNames.value = new Set(plugins.keys());
};

export const isPluginInstalled = (name: string): boolean => installedPluginNames.value.has(name);

export const fetchStorePlugins = async (): Promise<IStorePlugin[]> => mockStore.plugins;

export const searchPlugins = (plugins: IStorePlugin[], keyword: string): IStorePlugin[] => {
  if (!keyword.trim()) return plugins;
  const lower = keyword.toLowerCase();
  return plugins.filter((plugin) => {
    const fields = [plugin.title, plugin.subtitle, plugin.description, plugin.author, plugin.name];
    const textMatch = fields.some(field => field?.toLowerCase().includes(lower));
    if (textMatch) return true;
    const pinyinStr = fields.filter(Boolean).map(f => pinyin(f!, { toneType: 'none' }))
      .join(' ')
      .toLowerCase();
    return pinyinStr.includes(lower);
  });
};

export const getStore = () => fetchStorePlugins();
