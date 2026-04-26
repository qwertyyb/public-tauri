/**
 * 插件系统常量定义
 */

// Wujie 子应用池最大数量
export const MAX_WUJIE_APPS = 15;

/**
 * 内置插件名称列表（plugins/ 目录下的插件）
 * 这些插件在初始化后会被标记为受保护，不受 LRU 驱逐策略影响
 */
export const INNER_PLUGIN_NAMES = [
  'clipboard',
  'translate',
  'launcher',
  'calculator',
  'transform',
  'snippets',
  'qrcode',
  'mdn',
  'emoji',
  'confetti',
  'script-commands',
] as const;

export type InnerPluginName = typeof INNER_PLUGIN_NAMES[number];
