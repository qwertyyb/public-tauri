import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    'command-hot': './src/command-hot.ts',
    'command-latest': './src/command-latest.ts',
  },
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outExtensions: () => ({ js: '.js' }),
});
