import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts', './src/cli.ts'],
  platform: 'node',
  target: 'node20',
  dts: false,
});
