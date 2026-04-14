import eslintTencent from 'eslint-config-tencent/flat';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import typescriptEslint from 'typescript-eslint';

export default typescriptEslint.config(
  { ignores: ['*.d.ts', '**/coverage', '**/dist', 'src-tauri/**/*'] },
  {
    rules: {
      '@typescript-eslint/no-misused-promises': 0,
    },
  },
  {
    extends: [
      eslintTencent({
        tsconfigRootDir: fileURLToPath(new URL('./', import.meta.url)),
        project: [
          fileURLToPath(new URL('./tsconfig.node.json', import.meta.url)),
          fileURLToPath(new URL('./tsconfig.app.json', import.meta.url)),
          fileURLToPath(new URL('./tsconfig.plugins.json', import.meta.url)),
          fileURLToPath(new URL('./src-node/tsconfig.json', import.meta.url)),
          fileURLToPath(new URL('./packages/template/tsconfig.node.json', import.meta.url)),
          fileURLToPath(new URL('./store/plugins/v2ex/tsconfig.json', import.meta.url)),
          fileURLToPath(new URL('./store/plugins/magic/tsconfig.json', import.meta.url)),
        ],
      }),
    ],
    rules: {
      '@typescript-eslint/no-misused-promises': 0,
    },
  },
  {
    // eslint.config.mjs 的 eslint 配置
    files: ['eslint.config.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // 业务代码的 eslint 配置
    extends: [
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    files: ['src/**/*.{ts,vue}', 'packages/**/*.{ts,vue}'],
    rules: {
      '@typescript-eslint/no-misused-promises': 0,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        parser: typescriptEslint.parser,
      },
    },
  },
);
