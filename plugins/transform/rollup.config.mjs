import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const createRollupConfig = (input, options = {}) => ({
  input: input,
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    commonjs(),
    nodeResolve({
      browser: options.isBrowser
    }),
    esbuild({
      target: 'es2022',
      tsconfig: './tsconfig.json',
      platform: options.isBrowser ? 'browser' : 'node'
    })
  ],
  // external: [
  //   /^\@tauri-apps\/api/,
  // ]
})

export default defineConfig([createRollupConfig('./src/preload.ts')]);