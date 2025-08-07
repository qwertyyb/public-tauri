import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve';

const createRollupConfig = (input) => ({
  input: input,
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    commonjs(),
    nodeResolve(),
    json(),
    esbuild({
      target: 'es2022',
      tsconfig: './tsconfig.json',
    })
  ],
  // external: [
  //   /^\@tauri-apps\/api/,
  // ]
})

export default defineConfig([createRollupConfig('./src/server.ts'), createRollupConfig('./src/command.preload.ts')]);