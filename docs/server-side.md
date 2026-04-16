# 服务端插件

当插件需要在服务端（Node.js 环境）执行逻辑时，可以使用服务端插件功能。服务端代码运行在本地 HTTP 服务器上，拥有完整的 Node.js 能力。

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

在 main 模式下，使用 `createPluginChannel` 创建通信通道：

```ts
import { createPluginChannel } from '@public-tauri/api'

// createPluginChannel 需要传入插件名称
const channel = createPluginChannel('my-plugin')

// 调用服务端方法
const result = await channel.invoke('readFile', '/path/to/file.txt')

// 监听服务端事件
channel.on('my-event', (data) => {
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

## 注意事项

1. **服务端模块可选**：如果不需要服务端能力，无需配置 `server` 字段。
2. **安全性**：服务端代码拥有完整的系统访问权限，请注意安全。
3. **生命周期**：服务端模块在插件注册时加载，在插件卸载时销毁。
4. **调用约定**：`invoke` 的第一个参数是服务端导出的函数名，后续参数依次传递。
5. **ListView 模式**：`template: "listView"` 的插件，其 preload 脚本也运行在服务端环境中。
