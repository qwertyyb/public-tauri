# 服务端插件

当插件需要在服务端（Node.js 环境）执行逻辑时，可以使用服务端插件功能。服务端代码在本地 **Node 侧载**（`src-node`）中通过 **Worker 线程** 执行，与 Koa 主进程隔离，单个插件未捕获异常不会拖垮整个 Node 服务。

在插件 **server** 入口中如需使用与主应用一致的 API，请从 **`@public-tauri/api/node`** 引入：与 `localhost:2345` 上已有能力一致的（如 `utils` 中走 `invokeServerUtils` 的路径）在 Node 内直接完成；仅当需要 Tauri、WebView 或 `window` 事件时，才经主窗体上的 Socket 回桥执行。主应用启动后会自动建立 `__public_tauri_host__` 的 Socket 连接用于该回桥。

`pnpm --filter src-node run build` 会生成 `dist/public-plugin-worker.cjs`，主进程用 `new Worker(fileUrl)` 加载。协议字段见 `src-node/src/plugin/worker-protocol.ts`（`kind: m2w:*` / `w2m:*` 前缀，避免与旧版单字母字段混淆）。

## 配置

在 `package.json` 的 `publicPlugin` 字段中添加 `server` 指向服务端入口文件：

```json
{
  "publicPlugin": {
    "server": "dist/server.js",
    "commands": [...]
  }
}
```

## 服务端入口文件

服务端入口文件是一个标准的 Node.js ESM 模块。你可以导出函数供前端通过 `invoke` 调用：

```ts
// src/server.ts
import fs from 'node:fs'
import path from 'node:path'

export async function readFile(filePath: string) {
  const content = await fs.promises.readFile(filePath, 'utf-8')
  return content
}

export async function listFiles(dirPath: string) {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  return entries.map(entry => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
  }))
}

export async function runScript(script: string) {
  // 执行系统命令等操作
  const { exec } = await import('node:child_process')
  return new Promise((resolve, reject) => {
    exec(script, (error, stdout, stderr) => {
      if (error) reject(error)
      else resolve({ stdout, stderr })
    })
  })
}
```

## 前端调用

### view 模式

在 view 模式下，使用 `invoke` 调用服务端方法：

```ts
import { invoke, on } from '@public-tauri/api'

// 调用服务端方法
const content = await invoke<string>('readFile', '/path/to/file.txt')
const files = await invoke<Array<{name: string, isDirectory: boolean}>>('listFiles', '/path/to/dir')

// 监听服务端事件
on('file-changed', (data) => {
  console.log('文件变化:', data)
})
```

### main 模式

在 main 模式下同样使用 `invoke` / `on`。插件名称由宿主注入，插件代码不需要也不应该直接接触 `createPluginChannel`、`invokePluginServerMethod` 等宿主内部接口：

```ts
import { invoke, on } from '@public-tauri/api'

const result = await invoke('readFile', '/path/to/file.txt')

on('my-event', (data) => {
  console.log('收到事件:', data)
})
```

## 服务端推送事件

服务端可以通过 `registerPlugin` 提供的上下文向前端推送事件。服务端模块在被加载时，会收到插件名称等信息。

## 静态资源

插件目录会自动注册为静态资源服务。你可以通过 HTTP 访问插件目录下的文件：

```
http://<plugin-name>.plugin.localhost:2345/dist/index.html
```

对于 npm scope 包（如 `@scope/my-plugin`）：

```
http://my-plugin.scope.plugin.localhost:2345/dist/index.html
```

这使得 view 模式的插件可以直接通过 HTTP URL 加载。

## 构建服务端代码

服务端代码需要构建为 Node.js 可执行的 ESM 格式。推荐使用 Rollup 或 tsdown：

### Rollup 配置

```js
// rollup.config.mjs
import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default defineConfig([
  // 前端入口
  {
    input: './src/main.ts',
    output: { dir: 'dist', format: 'esm' },
    plugins: [commonjs(), nodeResolve(), esbuild({ target: 'es2022' })],
  },
  // 服务端入口
  {
    input: './src/server.ts',
    output: { dir: 'dist', format: 'esm' },
    plugins: [commonjs(), nodeResolve(), esbuild({ target: 'es2022' })],
    external: ['node:*'],  // 外部化 Node.js 内置模块
  },
])
```

## 在 server 中使用 `@public-tauri/api`

构建 server 产物时，将 `@public-tauri/api` 解析到 Node 实现，例如 Rollup `alias`：`@public-tauri/api` → `@public-tauri/api/node`（或在你的构建里将 `server` 入口单独配置 `resolve.alias`）。在 server 源码中：

```ts
import { utils, fetch, dialog } from '@public-tauri/api/node'
```

`mainWindow.on` 等需要回调的 API 无法经回桥序列化，请在 server 中避免使用；需要时改由前端完成。
`invoke` 仍然是前端调用 server 的入口，不支持在一个 server Worker 中反向调用自身或其它插件 Worker。`createPluginStorage`、`createPluginChannel`、`invokePluginServerMethod` 是宿主内部能力，不从 `@public-tauri/api` 暴露给插件。

## 注意事项

1. **服务端模块可选**：如果不需要服务端能力，无需配置 `server` 字段。
2. **安全性**：服务端代码拥有完整的系统访问权限，请注意安全。
3. **生命周期**：服务端模块在插件注册时加载，在插件卸载时销毁。
4. **调用约定**：`invoke` 的第一个参数是服务端导出的函数名，后续参数依次传递。
5. **ListView / preload**：`command.preload` 等由 HTTP 静态资源在 **WebView** 中加载；本页所述为 `publicPlugin.server` 指向的 **Node** 模块。
