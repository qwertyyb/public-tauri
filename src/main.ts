import { createApp } from 'vue';
import VirtualList from 'vue-virtual-list-v3';
import ElementPlus from 'element-plus';
// import 'element-plus/dist/index.css'
import App from './App.vue';
import './style.css';
import { createDraggable } from './utils/draggable';
import { registerMainShortcut } from './utils/shortcut';
import { listenEvents } from './utils/events';
import { init } from './plugin/manager';
import { createTray } from './utils/tray';
import { start as startServer } from './utils/server';

createDraggable();
registerMainShortcut('Command+Space');
listenEvents();
createTray();
// startServer().then(() => {
init();
// });

const app = createApp(App);

app.use(VirtualList);
app.use(ElementPlus);

app.mount('#app');
