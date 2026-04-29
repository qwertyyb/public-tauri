import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts', './src/node.ts', './src/raycast.ts', './src/raycast-utils.ts'],
  deps: {
    alwaysBundle: () => true,
  },
  dts: {
    eager: true,
  },
});
