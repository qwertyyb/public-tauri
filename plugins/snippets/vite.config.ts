import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'process.env.PLUGIN_NAME': JSON.stringify('snippets')
  },
  plugins: [
    vue(),
  ],
  resolve: {
  },
  build: {
    lib: {
      entry: {
        index: './src/index.ts'
      },
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', 'element-plus'],
      output: {
        format: 'esm',
        dir: 'dist',
      }
    }
  }
})
