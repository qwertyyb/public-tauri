import DefaultTheme from 'vitepress/theme';
import type { EnhanceAppContext } from 'vitepress';
import PluginStore from './components/PluginStore.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp(ctx: EnhanceAppContext) {
    ctx.app.component('PluginStore', PluginStore);
  },
};
