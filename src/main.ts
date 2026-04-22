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

// @ts-expect-error
window[CORE_API_KEY] = core;

createDraggable();
listenEvents();
createTray();

// registerServerModule / 插件静态资源依赖 Node 服务（127.0.0.1:2345），DEV 与生产均先 startServer 再 init
startServer()
  .then(() => {
    getSettings().then(settings => registerMainShortcut(settings.shortcuts));
    return init();
  })
  .then(() => initDeepLinks());

const app = createApp(App);

app.use(VirtualList);
app.use(ui);

app.mount('#app');
