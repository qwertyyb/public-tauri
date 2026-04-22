import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  build: {
    sourcemap: true,
    rollupOptions: {
      external: ['vue'],
    },
  },
  plugins: [
    vue(),
    ui({
      ui: {
        colors: {
          primary: 'green',
          neutral: 'zinc',
        },
      },
    }),
  ],
  define: {
    BUILTIN_PLUGINS_PATH: JSON.stringify(fileURLToPath(new URL('./plugins', import.meta.url))),
    LIST_VIEW_TEMPLATE_PATH: JSON.stringify(fileURLToPath(new URL('./packages/template/dist', import.meta.url))),
  },

  clearScreen: false,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: 'ws',
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
}));
