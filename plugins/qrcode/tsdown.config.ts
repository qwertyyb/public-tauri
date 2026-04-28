import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['./src/index.ts', './src/detect.command.ts'],
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outExtensions: () => ({ js: '.js' }),
  },
  {
    entry: './src/server.ts',
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    outExtensions: () => ({ js: '.js' }),
  },
]);
