import { pinyin } from 'pinyin-pro';
import { convertedNpmPackageNameFromRaycastPackageName } from '@/utils/raycast-plugin-package-name';
import type { RaycastStoreExtension, RaycastStoreIndex } from '@/types/raycast-store';

const DEFAULT_RAYCAST_STORE_URL = 'https://raw.githubusercontent.com/qwertyyb/public-tauri/refs/heads/master/store/raycast/index.json';

export const getRaycastStoreIndexUrl = (): string => {
  const u = (import.meta.env.VITE_RAYCAST_STORE_INDEX_URL as string | undefined)?.trim();
  return u || DEFAULT_RAYCAST_STORE_URL;
};

export const fetchRaycastStoreIndex = async (): Promise<RaycastStoreIndex> => {
  const r = await fetch(getRaycastStoreIndexUrl());
  if (!r.ok) {
    throw new Error(`获取 Raycast 商店索引失败: ${r.status}`);
  }
  return r.json() as Promise<RaycastStoreIndex>;
};

/** 转换后与 `isPluginInstalled` 对齐的 npm 包名 */
export const publicPluginNpmNameForRaycastExtension = (ext: Pick<RaycastStoreExtension, 'name'>): string => convertedNpmPackageNameFromRaycastPackageName(ext.name);

/** 折叠 `.` / `..`，防止路径片段异常 */
const normalizeDotSegments = (segments: string[]): string[] => {
  const out: string[] = [];
  for (const s of segments) {
    if (s === '.' || s === '') continue;
    if (s === '..') {
      out.pop();
      continue;
    }
    out.push(s);
  }
  return out;
};

/**
 * 将 Raycast package.json / command 的 `icon` 转为 GitHub raw URL。
 * - 纯文件名或多段路径（无 `./`、`/`）：相对扩展目录下的 **assets/**（与 Raycast / raycast-convert 惯例一致）。
 * - `./…`：相对扩展根目录。
 * - `/…`：相对扩展根目录（去掉前导 `/`）。
 * - `http(s):`、`data:`、`asset:`、`public-icon:`：原样返回（已由 Raycast 或宿主解析）。
 */
export const resolveRaycastIconUrlFromSource = (
  icon: string | undefined,
  extensionSourcePath: string,
  index: Pick<RaycastStoreIndex, 'source'>,
): string | undefined => {
  if (!icon?.trim()) return undefined;
  const t = icon.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^data:/i.test(t)) return t;
  if (/^(asset:|public-icon:)/i.test(t)) return t;

  const { commit, repo } = index.source;
  const rootSegments = extensionSourcePath.split(/[/\\]/).filter(Boolean);

  const buildUrl = (relativeSegments: string[]): string | undefined => {
    const pathSegments = normalizeDotSegments([...rootSegments, ...relativeSegments]);
    if (!pathSegments.length) return undefined;
    const pathPart = pathSegments.map(seg => encodeURIComponent(seg)).join('/');
    return `https://raw.githubusercontent.com/${repo}/${commit}/${pathPart}`;
  };

  if (t.startsWith('./')) {
    const rest = t.slice(2);
    const segs = rest.split(/[/\\]/).filter(Boolean);
    if (!segs.length) return undefined;
    return buildUrl(segs);
  }
  if (t.startsWith('/')) {
    const rest = t.slice(1);
    const segs = rest.split(/[/\\]/).filter(Boolean);
    if (!segs.length) return undefined;
    return buildUrl(segs);
  }

  const parts = t.split(/[/\\]/).filter(Boolean);
  if (parts[0]?.toLowerCase() === 'assets') {
    return buildUrl(parts);
  }
  return buildUrl(['assets', ...parts]);
};

/** Raycast 扩展列表 / 详情：扩展级 icon */
export const raycastExtensionIconUrl = (
  ext: RaycastStoreExtension,
  index: Pick<RaycastStoreIndex, 'source'>,
): string | undefined => resolveRaycastIconUrlFromSource(ext.icon, ext.source.path, index);

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
