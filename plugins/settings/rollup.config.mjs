import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const createRollupConfig = input => ({
  input,
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    commonjs(),
    nodeResolve(),
    esbuild({
      target: 'es2022',
    }),
    replace({
      preventAssignment: true,
      'process.env.PLUGIN_NAME': JSON.stringify('settings'),
    }),
  ],
});

export default defineConfig([createRollupConfig('./src/index.ts')]);
