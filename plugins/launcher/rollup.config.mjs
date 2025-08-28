import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';

const createRollupConfig = (input, options = {}) => ({
  input: input,
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    // commonjs(),
    nodeResolve({
      browser: options.isBrowser
    }),
    esbuild({
      target: 'es2022',
      tsconfig: './tsconfig.json',
      platform: options.isBrowser ? 'browser' : 'node'
    }),
    replace({
      preventAssignment: true,
      'process.env.PLUGIN_NAME': JSON.stringify('launcher'),
    })
  ],
  external: [
    'vue',
  ]
})

export default defineConfig([createRollupConfig('./src/server.ts'), createRollupConfig('./src/preload.ts', { isBrowser: true })]);