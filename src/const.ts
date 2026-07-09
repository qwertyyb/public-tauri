export const POP_TO_ROOT_TIMEOUT = 90 * 1000;

export const EVENT_NAME = {
  FOCUSED: 'window:focused',
  BLURRED: 'window:blurred',
} as const;

export const NAV_HEIGHT = 48;

export const ACTION_BAR_HEIGHT = 42;

export const DIVIDER_WIDTH = 1;

export const STORAGE_KEY = {
  DEV_PLUGIN_PATH_LIST: 'devPluginPathList',
  RAYCAST_PLUGIN_PATH_LIST: 'raycastPluginPathList',
  STORE_PLUGIN_PATH_LIST: 'storePluginPathList',
} as const;

export const DEEP_LINK_SCHEMA_ORIGIN = 'public://public.qwertyyb.com';

export const STORE_URL = 'https://raw.githubusercontent.com/qwertyyb/public-tauri/refs/heads/master/store/index.json';

export const NPM_REGISTRY = 'https://registry.npmjs.org';
