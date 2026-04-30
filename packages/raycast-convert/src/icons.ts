const isUrlLike = (value: string) => /^(?:https?:|data:|asset:|public-icon:)/.test(value);
const hasPathSegment = (value: string) => value.includes('/') || value.includes('\\');

export const DEFAULT_PLUGIN_ICON = 'extension';

export const normalizeRaycastIcon = (icon: string | undefined) => {
  if (!icon) return undefined;
  if (isUrlLike(icon)) return icon;
  if (icon.startsWith('./') || icon.startsWith('../') || icon.startsWith('/')) return icon;
  if (hasPathSegment(icon)) return `./${icon}`;
  return `./assets/${icon}`;
};
