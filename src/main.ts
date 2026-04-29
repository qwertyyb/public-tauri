import { createApp } from 'vue';
import VirtualList from 'vue-virtual-list-v3';
import ui from '@nuxt/ui/vue-plugin';
import { CORE_API_KEY } from '@public/core/const';
import * as core from '@public/core';
import App from './App.vue';
import './assets/css/main.css';
import './style.css';
import { createDraggable } from './utils/draggable';
import { listenEvents } from './utils/events';
import { initDeepLinks } from './utils/deep-link';
import { init } from './plugin/manager';
import { createTray } from './utils/tray';
import { start as startServer } from './utils/server';
import { getSettings, registerMainShortcut } from './services/settings';
import { connectTauriNodeHostSocket } from './bridge/node-tauri-rpc';
import { getCurrentWindow } from '@tauri-apps/api/window';

// @ts-expect-error
window[CORE_API_KEY] = core;

// In development, expose core API directly on window for WebDriver E2E testing
if (!import.meta.env.PROD && typeof window !== 'undefined') {
  // @ts-expect-error
  window.__PUBLIC_CORE__ = core;
}

createDraggable();
listenEvents();
createTray();

// registerServerModule / 插件静态资源依赖 Node 服务（127.0.0.1:2345），DEV 与生产均先 startServer 再 init
startServer()
  .then(() => {
    connectTauriNodeHostSocket();
    getSettings().then((settings) => {
      registerMainShortcut(settings.shortcuts).then((result) => {
        if (!result.registered) {
          console.warn('[Permissions] Failed to register main shortcut');
        }
      });
    });
    return init();
  })
  .then(() => {
    if (!import.meta.env.PROD && typeof window !== 'undefined') {
      void import('@tauri-apps/api/core').then((m) => {
        (window as unknown as { __E2E_INVOKE?: typeof m.invoke })
          .__E2E_INVOKE = m.invoke;
      });
    }
    return initDeepLinks();
  })
  .finally(() => {
    getCurrentWindow().show();
  });

const app = createApp(App);

app.use(VirtualList);
app.use(ui);

app.mount('#app');
