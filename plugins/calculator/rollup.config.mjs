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
      tsconfig: './tsconfig.json',
    }),
    replace({
      preventAssignment: true,
      'process.env.PLUGIN_NAME': JSON.stringify('calculator'),
    }),
  ],
  treeshake: 'smallest',
});

export default defineConfig([
  createRollupConfig('./src/index.ts'),
  createRollupConfig('./src/command.history.ts'),
]);
