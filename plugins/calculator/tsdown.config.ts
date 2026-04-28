import { defineConfig } from 'tsdown';
import { fileURLToPath } from 'node:url';

const emptyCryptoPath = fileURLToPath(new URL('./src/empty-crypto.ts', import.meta.url));

export default defineConfig({
  entry: ['./src/index.ts', './src/command.history.ts'],
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outExtensions: () => ({ js: '.js' }),
  alias: {
    crypto: emptyCryptoPath,
  },
});
