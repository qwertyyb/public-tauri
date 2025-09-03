import eslintTencent from 'eslint-config-tencent/flat';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import typescriptEslint from 'typescript-eslint';

export default typescriptEslint.config([
  { ignores: ['*.d.ts', '**/coverage', '**/dist'] },
  ...eslintTencent({
    tsconfigRootDir: fileURLToPath(new URL('./', import.meta.url)),
    project: fileURLToPath(new URL('./tsconfig.node.json', import.meta.url)),
  }),
  {
    // eslint.config.mjs 的 eslint 配置
    files: ['eslint.config.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  ...eslintTencent({
    tsconfigRootDir: fileURLToPath(new URL('./', import.meta.url)),
    project: fileURLToPath(new URL('./tsconfig.app.json', import.meta.url)),
  }),
  {
    // 业务代码的 eslint 配置
    extends: [
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    files: ['src/**/*.{ts,vue}', 'packages/**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        parser: typescriptEslint.parser,
      },
    },
  },
  // {
  //   extends: [
  //   ],
  //   // files: ['src/**/*.ts', 'src/**/*.vue'],
  //   // languageOptions: {
  //   //   ecmaVersion: 'latest',
  //   //   sourceType: 'module',
  //   //   globals: globals.browser,
  //   //   parserOptions: {
  //   //     parser: typescriptEslint.parser,
  //   //     project: './tsconfig.app.json',
  //   //     extraFileExtensions: ['.vue'],
  //   //   },
  //   // },
  //   rules: {
  //     '@typescript-eslint/no-explicit-any': false,
  //   },
  // },
]);
