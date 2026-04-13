/// <reference types="vite/client" />

declare module 'vue-virtual-list-v3' {
  import type { Plugin } from 'vue';
  const VirtualList: Plugin;
  export default VirtualList;
}

declare const BUILTIN_PLUGINS_PATH: string;
declare const LIST_VIEW_TEMPLATE_PATH: string;
