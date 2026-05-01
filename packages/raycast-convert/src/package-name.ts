import path from 'node:path';
import type { RaycastPackage } from './types';

export const RAYCAST_CONVERTED_SCOPE = '@public-tauri-raycast';

const sanitizeSlug = (raw: string): string => {
  let segment = raw.trim().toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!segment || /^[._]/.test(segment)) {
    segment = `plugin-${segment || 'unnamed'}`.replace(/^-+/, '');
  }
  return segment || 'raycast-plugin';
};

/** Raycast package.json name may be unscoped or @scope/pkg; derive a single npm name segment. */
export const resolveRaycastSlug = (sourcePackage: RaycastPackage, inputDir: string): string => {
  const raw = typeof sourcePackage.name === 'string' ? sourcePackage.name.trim() : '';
  if (raw.startsWith('@')) {
    const slash = raw.indexOf('/');
    if (slash !== -1) {
      return sanitizeSlug(raw.slice(slash + 1));
    }
    return sanitizeSlug(raw.slice(1));
  }
  if (raw) {
    return sanitizeSlug(raw);
  }
  return sanitizeSlug(path.basename(path.resolve(inputDir)));
};

export const resolveConvertedPackageName = (sourcePackage: RaycastPackage, inputDir: string): string => `${RAYCAST_CONVERTED_SCOPE}/${resolveRaycastSlug(sourcePackage, inputDir)}`;
