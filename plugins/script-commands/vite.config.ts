import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import type { PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'

const nuxtUi = ui({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'zinc',
    },
  },
}) as PluginOption

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    nuxtUi,
  ],
  base: '/dist/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  }
})
