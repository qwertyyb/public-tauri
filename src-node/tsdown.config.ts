import { defineConfig } from 'tsdown';
import pkg from './package.json' with { type: 'json' }

const noBundleModules = ['@nut-tree-fork/nut-js', 'better-sqlite3']

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'node',
  shims: true,
  noExternal: Object.keys(pkg.dependencies).filter(name => !noBundleModules.includes(name))
});
