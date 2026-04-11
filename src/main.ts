import { createApp } from 'vue';
import VirtualList from 'vue-virtual-list-v3';
import ElementPlus from 'element-plus';
import { CORE_API_KEY } from '@public/core/const';
import * as core from '@public/core';
import App from './App.vue';
import './style.css';
import { createDraggable } from './utils/draggable';
import { listenEvents } from './utils/events';
import { init } from './plugin/manager';
import { createTray } from './utils/tray';
import { start as startServer } from './utils/server';
import { getSettings, registerMainShortcut } from './services/settings';

// @ts-expect-error
window[CORE_API_KEY] = core;

createDraggable();
listenEvents();
createTray();

if (import.meta.env.DEV) {
  getSettings().then(settings => registerMainShortcut(settings.shortcuts));
  init();
} else {
  startServer()
    .then(() => {
      getSettings().then(settings => registerMainShortcut(settings.shortcuts));
      init();
    });
}

const app = createApp(App);

app.use(VirtualList);
app.use(ElementPlus);

app.mount('#app');
