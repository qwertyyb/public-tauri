import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  input: {
    'command-hot': './src/command-hot.ts',
    'command-latest': './src/command-latest.ts',
  },
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
    }),
  ],
  treeshake: 'smallest',
});
