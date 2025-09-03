import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';

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
      'process.env.PLUGIN_NAME': JSON.stringify('ai'),
    }),
  ],
});

export default defineConfig([createRollupConfig('./src/index.ts')]);
