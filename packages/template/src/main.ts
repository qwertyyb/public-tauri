import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

declare global {
  interface Window {
    $commands: { name: string, url: string }[]
  }
}

const app = createApp(App);

app.use(router);

app.mount('#app');
