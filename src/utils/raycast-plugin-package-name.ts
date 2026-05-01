/**
 * Raycast 扩展 package.json `name` → 转换后的 npm 包名（规则须与 `packages/raycast-convert/src/package-name.ts` 保持一致）。
 * 应用侧独立维护：`raycast-convert` 定位为 CLI 即用工具，不由应用运行时引用。
 */

export const RAYCAST_CONVERTED_SCOPE = '@public-tauri-raycast';

function sanitizeSlug(raw: string): string {
  let segment = raw.trim().toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!segment || /^[._]/.test(segment)) {
    segment = `plugin-${segment || 'unnamed'}`.replace(/^-+/, '');
  }
  return segment || 'raycast-plugin';
}

/** 商店索引 `extensions[].name` 或任意 Raycast package name 字符串 → `@public-tauri-raycast/...` */
export function convertedNpmPackageNameFromRaycastPackageName(name: string): string {
  const raw = name.trim();
  if (raw.startsWith('@')) {
    const slash = raw.indexOf('/');
    if (slash !== -1) {
      const scope = raw.slice(1, slash);
      const pkg = raw.slice(slash + 1);
      return `${RAYCAST_CONVERTED_SCOPE}/${sanitizeSlug(scope)}_${sanitizeSlug(pkg)}`;
    }
    return `${RAYCAST_CONVERTED_SCOPE}/${sanitizeSlug(raw.slice(1))}`;
  }
  if (raw) {
    return `${RAYCAST_CONVERTED_SCOPE}/${sanitizeSlug(raw)}`;
  }
  return `${RAYCAST_CONVERTED_SCOPE}/raycast-plugin`;
}
