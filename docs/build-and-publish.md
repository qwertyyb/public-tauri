# 构建与发布

本文档介绍如何构建 Public Tauri 插件并发布到应用商店。

## 项目结构

一个标准的插件项目结构如下：

```
my-plugin/
├── assets/
│   ├── icon.png              # 亮色主题图标 (512x512)
│   └── icon@dark.png         # 暗色主题图标 (可选)
├── src/
│   ├── main.ts               # 前端入口（none 模式）
│   ├── server.ts             # 服务端入口（可选）
│   └── command.preload.ts    # listView preload（可选）
├── dist/                     # 构建产物
├── package.json
├── rollup.config.mjs         # Rollup 配置（none/listView 模式）
├── vite.config.ts            # Vite 配置（view 模式）
└── tsconfig.json
```

## 构建 none 模式插件

使用 Rollup 将 TypeScript 编译为 ESM 格式：

### 安装构建依赖

```json
{
  "devDependencies": {
    "@rollup/plugin-commonjs": "^28.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0",
    "rollup": "^4.0.0",
    "rollup-plugin-esbuild": "^6.0.0"
  }
}
```

### Rollup 配置

```js
// rollup.config.mjs
import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'

const createRollupConfig = (input) => ({
  input,
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    commonjs(),
    nodeResolve(),
    esbuild({
      target: 'es2022',
      tsconfig: './tsconfig.json',
    }),
  ],
  treeshake: 'smallest',
})

export default createRollupConfig('./src/main.ts')
```

### 构建命令

```json
{
  "scripts": {
    "build": "rollup --config ./rollup.config.mjs"
  }
}
```

```bash
pnpm build
```

## 构建 listView 模式插件

listView 模式的插件需要构建 preload 脚本：

### Rollup 配置

```js
// rollup.config.mjs
import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'

const createRollupConfig = (input) => ({
  input,
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    commonjs(),
    nodeResolve(),
    esbuild({
      target: 'es2022',
      tsconfig: './tsconfig.json',
    }),
    replace({
      preventAssignment: true,
      'process.env.PLUGIN_NAME': JSON.stringify('my-plugin'),
    }),
  ],
  treeshake: 'smallest',
})

export default defineConfig([createRollupConfig('./src/command.preload.ts')])
```

## 构建 view 模式插件

view 模式使用 Vite 构建 Vue/Web 应用：

### 安装依赖

```bash
pnpm add vue
pnpm add -D vite @vitejs/plugin-vue typescript vue-tsc
```

### Vite 配置

```ts
// vite.config.ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/dist/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      external: ['vue'],  // vue 由宿主提供
    },
  },
})
```

### 构建命令

```json
{
  "scripts": {
    "build": "vue-tsc --build && vite build"
  }
}
```

```bash
pnpm build
```

## package.json 完整示例

### none 模式

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "publicPlugin": {
    "title": "我的插件",
    "icon": "./assets/icon.png",
    "main": "dist/index.js",
    "commands": [
      {
        "name": "hello",
        "title": "Hello",
        "matches": [{ "type": "text", "keywords": ["hello"] }]
      }
    ]
  },
  "dependencies": {
    "@public-tauri/api": "^1.0.0"
  },
  "devDependencies": {
    "rollup": "^4.0.0",
    "rollup-plugin-esbuild": "^6.0.0",
    "@rollup/plugin-commonjs": "^28.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0"
  },
  "scripts": {
    "build": "rollup --config rollup.config.mjs"
  }
}
```

### view 模式

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "type": "module",
  "publicPlugin": {
    "title": "我的插件",
    "icon": "./assets/icon.png",
    "html": "./dist/index.html",
    "commands": [
      {
        "name": "main",
        "title": "打开插件",
        "mode": "view",
        "matches": [{ "type": "text", "keywords": ["my-plugin"] }]
      }
    ]
  },
  "dependencies": {
    "@public-tauri/api": "^1.0.0",
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "@vitejs/plugin-vue": "^6.0.0",
    "typescript": "~5.8.0",
    "vue-tsc": "^3.0.0"
  },
  "scripts": {
    "build": "vue-tsc --build && vite build"
  }
}
```

## 发布到应用商店

应用商店插件存放在 `store/plugins/` 目录下，每个插件一个子目录。

### 提交步骤

1. 确保 `package.json` 中的 `publicPlugin` 配置完整
2. 确保 `assets/` 目录中包含图标文件
3. 将插件目录放入 `store/plugins/<plugin-name>/`
4. 运行构建脚本更新商店索引：

```bash
pnpm run build:store
```

此脚本会读取所有 `store/plugins/` 下的插件 `package.json`，生成 `store/index.json` 索引文件。

### 索引文件结构

`store/index.json` 的结构如下：

```json
{
  "updateTime": 1700000000000,
  "plugins": [
    {
      "name": "my-plugin",
      "icon": "https://github.com/...",
      "version": "1.0.0",
      "author": "",
      "manifest": {
        "name": "my-plugin",
        "title": "我的插件",
        "icon": "https://github.com/...",
        "commands": [...]
      }
    }
  ]
}
```

## 注意事项

1. **`type: "module"`**：确保 `package.json` 中设置了 `"type": "module"`，插件使用 ESM 格式。
2. **图标尺寸**：图标建议使用 512 x 512 像素的 PNG 格式。
3. **依赖外部化**：view 模式的构建中，`vue` 等宿主已提供的库应标记为 `external`。
4. **构建产物路径**：确保 `package.json` 中的 `main` 或 `html` 字段指向正确的构建产物路径。
5. **@public-tauri/api**：插件应依赖 `@public-tauri/api` 而非直接依赖内部包。
