export default [
  {
    entry: "/Users/qwertyyb/projects/public-tauri/fixtures/raycast/view-basic-public/.raycast-build/server.ts",
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    outDir: "/Users/qwertyyb/projects/public-tauri/fixtures/raycast/view-basic-public/dist",
    outExtensions: () => ({ js: '.js' }),
    deps: {
      alwaysBundle: () => true,
    },
    alias: {
      "@raycast/api": "/Users/qwertyyb/projects/public-tauri/fixtures/raycast/view-basic-public/node_modules/@public-tauri/api/src/raycast.ts",
      "@public-tauri/api/node": "/Users/qwertyyb/projects/public-tauri/fixtures/raycast/view-basic-public/node_modules/@public-tauri/api/src/node.ts",
    },
  },
];
