# 快速开始

本指南将帮助你从零开始创建一个 Public Tauri 插件。

## 前置要求

- Node.js >= 20
- 包管理器：pnpm

## 创建插件项目

### 1. 初始化项目

在项目目录下创建 `package.json`，并添加 `publicPlugin` 字段来声明插件信息：

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "type": "module",
  "publicPlugin": {
    "title": "我的插件",
    "subtitle": "插件描述",
    "icon": "./assets/icon.png",
    "commands": [
      {
        "name": "hello",
        "title": "Hello World",
        "matches": [
          {
            "type": "text",
            "keywords": ["hello", "你好"]
          }
        ]
      }
    ]
  }
}
```

### 2. 安装依赖

```bash
pnpm add @public-tauri/api
```

### 3. 编写插件逻辑

创建 `src/main.js`（或 `.ts`）作为插件入口文件：

```js
import { definePlugin } from '@public-tauri/api'
import { dialog } from '@public-tauri/api'

export default definePlugin(({ updateCommands }) => {
  return {
    onAction(command, action, keyword, options) {
      dialog.showToast(`Hello! 你输入了: ${keyword}`)
    }
  }
})
```

> **注意**：使用 `definePlugin` 包裹时，`main` 入口文件对应的是"内置插件"模式，插件代码会在主进程中直接加载执行。

### 4. 构建插件

根据你选择的插件模式，构建方式有所不同：

**模式一：内置插件（mode: none）**

使用 Rollup 或类似工具将入口文件打包为 ESM 格式：

```bash
# 安装构建工具
pnpm add -D rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs rollup-plugin-esbuild

# 构建输出到 dist/index.js
pnpm rollup --config rollup.config.mjs
```

`rollup.config.mjs` 示例：

```js
import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default defineConfig({
  input: './src/main.ts',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    commonjs(),
    nodeResolve(),
    esbuild({ target: 'es2022' }),
  ],
})
```

构建完成后，在 `package.json` 中添加 `"main": "dist/index.js"` 指向构建产物。

**模式二：HTML 插件（mode: view）**

使用 Vite 构建一个 Web 应用：

```bash
pnpm create vite . --template vue-ts
pnpm add @public-tauri/api
```

构建产物输出到 `dist/`，在 `package.json` 中添加 `"html": "./dist/index.html"`。

**模式三：ListView 模板插件（mode: listView）**

使用 Rollup 构建一个 preload 脚本：

```bash
pnpm rollup --config rollup.config.mjs
```

构建产物输出到 `dist/command.preload.js`，在命令配置中添加 `"preload": "./dist/command.preload.js"`。

## 在应用中加载本地插件

完成构建并确保 `package.json` 能解析到入口后，在 **Public Tauri** 主窗口用内置命令即可加载正在开发的插件目录进行调试，**无需**改应用配置或了解主工程实现。步骤与说明见 **[加载本地开发插件](./dev-plugins.md)**。

### 5. 准备图标

在 `assets/` 目录下放置插件图标：

- `icon.png` - 亮色主题图标，建议尺寸 512 x 512 像素
- `icon@dark.png` - 暗色主题图标（可选）

## 插件类型选择

Public Tauri 支持三种插件模式，根据你的需求选择：

| 模式 | 适用场景 | 入口配置 | 参考文档 |
|------|---------|---------|---------|
| **none** | 简单操作，无需 UI | `main` + `commands[].mode: "none"` | [插件模式](./modes.md) |
| **listView** | 列表展示和搜索结果 | `template: "listView"` + `commands[].mode: "listView"` | [插件模式](./modes.md) |
| **view** | 自定义 Vue/Web 页面 | `html` + `commands[].mode: "view"` | [插件模式](./modes.md) |

## 完整示例

以下是一个最简插件的完整文件结构：

```
my-plugin/
├── assets/
│   └── icon.png
├── src/
│   └── main.ts
├── dist/
│   └── index.js          # 构建产物
├── package.json
├── rollup.config.mjs
└── tsconfig.json
```

## 下一步

- 了解 [插件配置清单](./manifest.md) 的所有可用字段
- 学习 [命令与匹配规则](./commands.md) 来定义触发条件
- 探索 [API 参考](./api-reference.md) 了解可用的全部能力
