/// <reference types="vite/client" />

/** 仅 DEV：供 WebDriver E2E 调用 registerPluginFromLocalPath / reloadPluginFromLocalPath */
interface Window {
  __PUBLIC_APP_PLUGINS_READY__?: boolean;
  __PUBLIC_DEV_REGISTER_PLUGIN_PATH__?: (pluginPath: string) => Promise<any>;
  __PUBLIC_DEV_RELOAD_PLUGIN_FROM_PATH__?: (pluginPath: string, options: { reload?: boolean } = {}) => Promise<any>;
  /** 仅 DEV：供 WebDriver 调用 `invoke`（如 `click_through_overlay_is_open`） */
  __E2E_INVOKE?: import('@tauri-apps/api/core').invoke;
  __DEEP_LINK_HANDLER?: (url: string) => Promise<void>;
}

declare module 'vue-virtual-list-v3' {
  import type { Plugin } from 'vue';
  const VirtualList: Plugin;
  export default VirtualList;
}

declare const BUILTIN_PLUGINS_PATH: string;
declare const LIST_VIEW_TEMPLATE_PATH: string;
