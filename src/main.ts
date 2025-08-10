import { createApp } from 'vue'
import VirtualList from 'vue-virtual-list-v3';
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import './style.css'
import { createDraggable } from './utils/draggable';
import { registerMainShortcut } from './utils/shortcut';
import { listenEvents } from './utils/events';
import { init } from './plugin/manager';

createDraggable()
registerMainShortcut('Command+Space')
listenEvents()

const app = createApp(App)

app.use(VirtualList)

app.mount('#app')

console.log('builtin plugins path', BUILTIN_PLUGINS_PATH)

init()
