# API 参考

`@public-tauri/api` 提供了丰富的 API 供插件使用。所有 API 均从 `@public-tauri/api` 直接导出。

## 安装

```bash
pnpm add @public-tauri/api
```

## API 导出概览

```ts
import {
  // 窗口控制
  mainWindow,

  // 剪贴板
  clipboard,

  // 弹窗与通知
  dialog,

  // 网络请求（绕过 CORS）
  fetch,

  // 系统工具
  utils,

  // 屏幕
  screen,

  // SQLite 数据库
  Database,

  // 插件本地存储
  storage,

  // 文件系统
  fs,

  // Shell 命令
  shell,

  // 打开外部链接/文件
  opener,

  // 文件图标解析
  resolveFileIcon,
  resolveLocalPath,

  // 文件保存对话框
  showSaveFilePicker,

  // 服务端通信（view 模式）
  invoke,
  on,

  // 服务端通信（main 模式）
  createPluginChannel,

  // 插件注册
  createPlugin,
  definePlugin,

  // 类型导出
  type ICommand,
  type IPluginLifecycle,
  type IListViewCommand,
  type IResultItem,
  type IAction,
  type IPreference,
  // ...
} from '@public-tauri/api'
```

---

## mainWindow

窗口控制 API。

```ts
mainWindow.hide(): Promise<void>
```

隐藏主窗口。

```ts
mainWindow.show(): Promise<void>
```

显示主窗口。

```ts
mainWindow.center(): Promise<void>
```

将主窗口居中显示。

```ts
mainWindow.clearInput(): void
```

清空搜索框输入。

```ts
mainWindow.popToRoot(options?: { clearInput?: boolean }): void
```

返回到根视图。

```ts
mainWindow.pushView(options: { path: string, params?: any }): void
```

导航到指定路径视图。

```ts
mainWindow.popView(options?: { count: number }): void
```

返回上一级视图。

```ts
mainWindow.onShow(callback: () => void): Promise<void>
```

监听窗口显示事件。

```ts
mainWindow.offShow(callback: () => void): void
```

取消监听窗口显示事件。

---

## clipboard

剪贴板 API，基于 `tauri-plugin-clipboard-api` 并扩展了粘贴功能。

```ts
clipboard.readText(): Promise<string>
```

读取剪贴板文本内容。

```ts
clipboard.writeText(text: string): Promise<void>
```

写入文本到剪贴板。

```ts
clipboard.readHtml(): Promise<string>
```

读取剪贴板 HTML 内容。

```ts
clipboard.writeHtml(html: string): Promise<void>
```

写入 HTML 到剪贴板。

```ts
clipboard.readImageBase64(): Promise<string>
```

读取剪贴板图片（Base64 格式）。

```ts
clipboard.writeImageBinary(base64: string): Promise<void>
```

写入图片到剪贴板（Base64 格式）。

```ts
clipboard.paste(): Promise<void>
```

模拟粘贴操作（Cmd+V）。

```ts
clipboard.clear(): Promise<void>
```

清空剪贴板。

```ts
clipboard.onClipboardUpdate(callback: () => void): Promise<() => void>
```

监听剪贴板变化事件，返回取消监听函数。

```ts
clipboard.startListening(): void
```

开始监听剪贴板。

```ts
clipboard.stopListening(): void
```

停止监听剪贴板。

---

## dialog

弹窗与通知 API。

```ts
dialog.showAlert(message: string, title?: string, options?: {
  type: 'info' | 'warning' | 'error',
  confirmText: string
}): Promise<void>
```

显示警告弹窗。

```ts
dialog.showConfirm(message: string, title?: string, options?: {
  type: 'info' | 'warning' | 'error',
  confirmText: string,
  cancelText: string
}): Promise<void>
```

显示确认弹窗。用户取消时 Promise 会被 reject。

```ts
dialog.showToast(message: string, options?: {
  duration: number,
  icon: string
}): Promise<void>
```

显示 Toast 通知。

---

## fetch

网络请求 API，绕过 CORS 限制，通过服务端代理请求。

```ts
fetch(input: RequestInfo, init?: RequestInit): Promise<Response>
```

用法与原生 `fetch` 一致，但请求会通过本地服务端代理，因此不受浏览器 CORS 策略限制。

```ts
const res = await fetch('https://api.example.com/data')
const data = await res.json()
```

---

## utils

系统工具 API。

```ts
utils.getCurrentPath(): Promise<string>
```

获取当前工作目录路径。

```ts
utils.getSelectedPath(): Promise<string[]>
```

获取当前选中的文件/文件夹路径。

```ts
utils.getFrontmostApplication(): Promise<IApplication | null>
```

获取当前最前台的应用信息。

```ts
interface IApplication {
  displayName: string
  executablePath: string
  bundleIdentifier: string
}
```

```ts
utils.runCommand(command: string): Promise<string>
```

执行系统命令并返回输出。

```ts
utils.runAppleScript(script: string): Promise<string>
```

执行 AppleScript 脚本并返回输出。

```ts
utils.getMousePosition(): Promise<{ x: number, y: number }>
```

获取鼠标当前位置（逻辑坐标）。

---

## screen

屏幕操作 API。

```ts
interface ScreenDetail {
  id: number
  name: number
  width: number
  height: number
  isBuiltin: boolean
  isPrimary: boolean
  x: number
  y: number
}
```

```ts
screen.getDetails(): Promise<ScreenDetail[]>
```

获取所有屏幕信息。

```ts
screen.capture(id: number): Promise<string>
```

截取指定屏幕的画面，返回 Base64 图片。

```ts
screen.screenFromPoint(x: number, y: number): Promise<ScreenDetail>
```

根据坐标获取所在屏幕。

---

## Database

SQLite 数据库 API，基于 `@tauri-apps/plugin-sql`。

```ts
import { Database } from '@public-tauri/api'

const db = await Database.load('sqlite:mydb.db')
await db.execute('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT)')
await db.execute('INSERT INTO items (name) VALUES ($1)', ['test'])
const results = await db.select<{ id: number, name: string }>('SELECT * FROM items')
```

---

## storage

插件本地存储 API。每个插件的存储空间是命名空间隔离的，无需担心键名冲突。

```ts
storage.getItem(key: string): Promise<any | undefined>
```

获取存储值。

```ts
storage.setItem(key: string, value: any): Promise<void>
```

设置存储值。

```ts
storage.removeItem(key: string): Promise<void>
```

删除指定键。

```ts
storage.allItems(): Promise<Record<string, any>>
```

获取当前插件的所有存储项。

```ts
storage.clear(): Promise<void>
```

清空当前插件的所有存储。

> **注意**：此 `storage` 是插件级别的隔离存储，key 会自动添加插件名称前缀。

---

## fs

文件系统 API，基于 `@tauri-apps/plugin-fs`。

```ts
import { fs } from '@public-tauri/api'

// 读取文本文件
const text = await fs.readTextFile('/path/to/file.txt')

// 读取二进制文件
const data = await fs.readFile('/path/to/file.bin')

// 写入文件
await fs.writeFile('/path/to/file.txt', 'content')

// 读取目录
const entries = await fs.readDir('/path/to/dir')

// 检查文件是否存在
const exists = await fs.exists('/path/to/file.txt')

// 更多 API 请参考 @tauri-apps/plugin-fs 文档
```

---

## shell

Shell 命令 API，基于 `tauri-plugin-shellx-api`。

```ts
import { shell } from '@public-tauri/api'

const output = await shell.Command.create('echo', ['hello']).execute()
console.log(output.stdout)
```

---

## opener

打开外部链接或文件。

```ts
import { opener } from '@public-tauri/api'

await opener.openUrl('https://example.com')
await opener.openPath('/path/to/file.pdf')
```

---

## resolveFileIcon / resolveLocalPath

```ts
resolveFileIcon(filePath: string): Promise<string>
```

获取文件的图标 URL。

```ts
resolveLocalPath(urlOrPath: string, options?: { basePath: string }): Promise<string>
```

将本地文件路径转换为可通过浏览器访问的 URL。

---

## showSaveFilePicker

文件保存对话框，基于 `@tauri-apps/plugin-dialog`。

```ts
import { showSaveFilePicker } from '@public-tauri/api'

const filePath = await showSaveFilePicker({
  defaultPath: '/path/to/default.txt',
  filters: [{ name: 'Text', extensions: ['txt'] }]
})
```

---

## invoke（view 模式）

在 view 模式下，调用服务端插件方法。

```ts
invoke<R>(name: string, ...args: any[]): Promise<R>
```

- `name` - 服务端方法名
- `args` - 传递给服务端方法的参数

```ts
const result = await invoke<string>('myMethod', 'arg1', 'arg2')
```

> **注意**：仅在 view 模式下可用。

## on（view 模式）

在 view 模式下，监听服务端事件。

```ts
on(event: string, callback: (data: any) => void): void
```

```ts
on('my-event', (data) => {
  console.log('收到事件:', data)
})
```

> **注意**：仅在 view 模式下可用。

---

## createPluginChannel（main 模式）

在 main 模式下，创建与服务端的通信通道。

```ts
createPluginChannel(pluginName: string): {
  invoke: <T = any>(name: string, ...args: any[]) => Promise<T>
  on: (event: string, callback: (data: any) => void) => void
}
```

> **注意**：仅在 main 模式下可用。

---

## createPlugin / definePlugin

插件注册辅助函数。详见 [生命周期 API](./lifecycle.md)。

```ts
// view 模式使用
createPlugin(options: IPluginLifecycle): void

// main 模式使用
definePlugin(options: (app: {
  updateCommands: (commands: ICommand[]) => void
}) => IPluginLifecycle
): (app: any) => IPluginLifecycle
```

---

## globalShortcut

全局快捷键 API。

```ts
import { globalShortcut } from '@public-tauri/api'

// 注册快捷键
await globalShortcut.register('Command+Shift+K', (event) => {
  if (event.state === 'Pressed') {
    console.log('快捷键触发')
  }
})

// 检查是否已注册
const isRegistered = await globalShortcut.isRegistered('Command+Shift+K')

// 取消注册
await globalShortcut.unregister('Command+Shift+K')
```
