import { defineConfig } from 'tsdown';
import pkg from './package.json' with { type: 'json' };
import { fileURLToPath } from 'url';

const DIR_PATH = fileURLToPath(new URL('./', import.meta.url));
const PROJECT_DIR = fileURLToPath(new URL('../', import.meta.url));

export default defineConfig([
  {
    entry: ['./src/index.ts'],
    platform: 'node',
    format: 'commonjs',
    shims: true,
    noExternal: Object.keys(pkg.dependencies),
    copy: [
      {
        from: `${PROJECT_DIR}/node_modules/.pnpm/@nut-tree-fork+libnut-darwin@2.7.5/node_modules/@nut-tree-fork/libnut-darwin/build/Release/libnut.node`,
        to: `${DIR_PATH}/build/libnut.node`,
      },
      {
        from: `${DIR_PATH}/node_modules/better-sqlite3/build/Release/better_sqlite3.node`,
        to: `${DIR_PATH}/build/better_sqlite3.node`,
      },
      {
        from: `${PROJECT_DIR}/node_modules/.pnpm/@nut-tree-fork+node-mac-permissions@2.2.1/node_modules/@nut-tree-fork/node-mac-permissions/build/Release/permissions.node`,
        to: `${DIR_PATH}/build/permissions.node`,
      },
    ],
  },
  {
    entry: {
      'public-plugin-worker': './src/plugin/worker/entry.ts',
    },
    platform: 'node',
    format: 'commonjs',
    clean: false,
  },
]);
