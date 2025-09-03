import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';

const createRollupConfig = (input, options = {}) => ({
  input,
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    commonjs(),
    nodeResolve({
      browser: options.isBrowser,
    }),
    esbuild({
      target: 'es2022',
      tsconfig: './tsconfig.json',
      platform: options.isBrowser ? 'browser' : 'node',
    }),
    replace({
      preventAssignment: true,
      'process.env.PLUGIN_NAME': JSON.stringify('qrcode'),
    }),
  ],
  external: [
    'sharp',
  ],
  treeshake: 'smallest',
});

export default defineConfig([createRollupConfig('./src/index.ts', { isBrowser: true }), createRollupConfig('./src/detect.command.ts', { isBrowser: true }), createRollupConfig('./src/server.ts', { isBrowser: false })]);
