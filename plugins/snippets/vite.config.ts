import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import type { PluginOption } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import ui from '@nuxt/ui/vite';

// pnpm 可能为 @nuxt/ui 与当前包各解析一版带不同 @types/node 的 Vite 类型，避免 plugins 报不兼容
const nuxtUi = ui({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'zinc',
    },
  },
}) as PluginOption;

// https://vite.dev/config/
export default defineConfig({
  base: '/dist/',
  plugins: [
    vue(),
    vueJsx(),
    nuxtUi,
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      external: ['vue'],
    },
  },
});
