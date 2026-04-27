import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts', './src/node.ts'],
  deps: {
    alwaysBundle: () => true,
  },
  dts: {
    eager: true,
  },
});
