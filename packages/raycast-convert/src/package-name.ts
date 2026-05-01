import path from 'node:path';
import type { RaycastPackage } from './types';

export const RAYCAST_CONVERTED_SCOPE = '@public-tauri-raycast';

/** npm 包名片段：与 npm 命名惯例对齐的小写、符号规整 */
export const sanitizeSlug = (raw: string): string => {
  let segment = raw.trim().toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!segment || /^[._]/.test(segment)) {
    segment = `plugin-${segment || 'unnamed'}`.replace(/^-+/, '');
  }
  return segment || 'raycast-plugin';
};

/**
 * 未 scope 的 Raycast 官方插件：一般为单段名字 → `@public-tauri-raycast/<slug>`。
 * 若将来出现 scoped：`@my-scope/xxx` → `@public-tauri-raycast/my-scope_xxx`。
 */
export const resolveRaycastSlug = (sourcePackage: RaycastPackage, inputDir: string): string => {
  const raw = typeof sourcePackage.name === 'string' ? sourcePackage.name.trim() : '';
  if (raw.startsWith('@')) {
    const slash = raw.indexOf('/');
    if (slash !== -1) {
      const scope = raw.slice(1, slash);
      const pkg = raw.slice(slash + 1);
      return `${sanitizeSlug(scope)}_${sanitizeSlug(pkg)}`;
    }
    return sanitizeSlug(raw.slice(1));
  }
  if (raw) {
    return sanitizeSlug(raw);
  }
  return sanitizeSlug(path.basename(path.resolve(inputDir)));
};

export const resolveConvertedPackageName = (sourcePackage: RaycastPackage, inputDir: string): string =>
  `${RAYCAST_CONVERTED_SCOPE}/${resolveRaycastSlug(sourcePackage, inputDir)}`;
