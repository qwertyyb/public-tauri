/// <reference types="vite/client" />

/** 仅 DEV：供 WebDriver E2E 调用 registerPluginFromLocalPath / reloadPluginFromLocalPath */
interface Window {
  __PUBLIC_DEV_REGISTER_PLUGIN_PATH__?: (pluginPath: string) => Promise<void>;
  __PUBLIC_DEV_RELOAD_PLUGIN_FROM_PATH__?: (pluginPath: string) => Promise<void>;
}

declare module 'vue-virtual-list-v3' {
  import type { Plugin } from 'vue';
  const VirtualList: Plugin;
  export default VirtualList;
}

declare const BUILTIN_PLUGINS_PATH: string;
declare const LIST_VIEW_TEMPLATE_PATH: string;
