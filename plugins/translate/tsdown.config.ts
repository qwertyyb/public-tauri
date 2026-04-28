import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: './src/server.ts',
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    outExtensions: () => ({ js: '.js' }),
  },
  {
    entry: './src/command.preload.ts',
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outExtensions: () => ({ js: '.js' }),
  },
]);
