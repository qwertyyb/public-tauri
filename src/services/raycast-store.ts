import { pinyin } from 'pinyin-pro';
import type { RaycastStoreExtension, RaycastStoreIndex } from '@/types/raycast-store';

const RAYCAST_STORE_URL = 'https://raw.githubusercontent.com/qwertyyb/public-tauri/refs/heads/master/store/raycast/index.json';

export const fetchRaycastStoreIndex = async (): Promise<RaycastStoreIndex> => {
  const r = await fetch(RAYCAST_STORE_URL);
  if (!r.ok) {
    throw new Error(`获取 Raycast 商店索引失败: ${r.status}`);
  }
  return r.json() as Promise<RaycastStoreIndex>;
};

const extensionSearchFields = (ext: RaycastStoreExtension): string[] => {
  const commandBits = (ext.commands || []).flatMap(c => [
    c.name,
    c.title,
    c.subtitle,
    c.description,
    ...(c.keywords || []),
  ]);
  return [
    ext.name,
    ext.title,
    ext.description,
    ext.author,
    ...(ext.categories || []),
    ...commandBits,
  ].filter((v): v is string => Boolean(v));
};

export const searchRaycastExtensions = (extensions: RaycastStoreExtension[], keyword: string): RaycastStoreExtension[] => {
  if (!keyword.trim()) return extensions;
  const lower = keyword.toLowerCase();
  return extensions.filter((ext) => {
    const fields = extensionSearchFields(ext);
    if (fields.some(field => field.toLowerCase().includes(lower))) return true;
    const pinyinStr = fields.map(f => pinyin(f, { toneType: 'none' }))
      .join(' ')
      .toLowerCase();
    return pinyinStr.includes(lower);
  });
};

export const findRaycastExtensionByName = (
  extensions: RaycastStoreExtension[],
  name: string,
): RaycastStoreExtension | undefined => extensions.find(e => e.name === name);
