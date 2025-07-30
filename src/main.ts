import { createApp } from 'vue'
import VirtualList from 'vue-virtual-list-v3';
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import './style.css'
import { createDraggable } from './utils/draggable';
import { registerMainShortcut } from './utils/shortcuts';
import { listenEvents } from './utils/events';

createDraggable()
registerMainShortcut()
listenEvents()

const app = createApp(App)

app.use(VirtualList)

app.mount('#app')
