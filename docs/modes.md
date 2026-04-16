# 插件模式

Public Tauri 支持三种插件运行模式，每种模式有不同的 UI 表现和开发方式。

## 模式概览

| 模式 | UI 表现 | 入口配置 | 适用场景 |
|------|---------|---------|---------|
| **none** | 无 UI，直接执行操作 | `main` 或 `preload` + `mode: "none"` | 简单操作如复制文本、打开链接 |
| **listView** | 内置列表视图 | `template: "listView"` + `mode: "listView"` | 搜索结果列表、历史记录等 |
| **view** | 自定义 HTML/Vue 页面 | `html` + `mode: "view"` | 复杂表单、自定义界面 |

---

## none 模式

最简单的模式，命令被触发后直接执行逻辑，没有任何 UI 视图。

### 配置

```json
{
  "publicPlugin": {
    "main": "dist/index.js",
    "commands": [
      {
        "name": "copy-hello",
        "title": "复制 Hello",
        "mode": "none",
        "matches": [{ "type": "text", "keywords": ["hello"] }]
      }
    ]
  }
}
```

### 实现

在 `main` 入口文件中，通过 `onEnter` 钩子实现逻辑：

```ts
import { definePlugin } from '@public-tauri/api'

export default definePlugin(() => {
  return {
    onEnter(command, query, options) {
      // 直接执行操作，例如写入剪贴板
      clipboard.writeText('Hello World!')
      dialog.showToast('已复制到剪贴板')
    }
  }
})
```

---

## listView 模式

使用内置的列表视图模板，适用于展示搜索结果列表。支持搜索过滤、列表项选择预览、操作按钮等功能。

### 配置

```json
{
  "publicPlugin": {
    "template": "listView",
    "commands": [
      {
        "name": "clipboard",
        "title": "剪切板",
        "mode": "listView",
        "preload": "./dist/command.preload.js",
        "matches": [
          { "type": "text", "keywords": ["剪切板", "clipboard"] },
          { "type": "trigger", "triggers": ["cp"], "title": "搜索剪切板"$query"" }
        ]
      }
    ]
  }
}
```

### 实现

创建一个 preload 脚本（如 `src/command.preload.ts`），导出 `IListViewCommand` 对象：

```ts
import type { IListViewCommand } from '@public-tauri/api'
import { clipboard, mainWindow } from '@public-tauri/api'

const listView: IListViewCommand = {
  // 视图展示时调用，加载初始数据
  async onShow(query, options, setList) {
    const items = await loadData()
    setList(items)
  },

  // 用户输入搜索关键词时调用
  async onSearch(keyword, setList) {
    const items = await search(keyword)
    setList(items)
  },

  // 用户选中某个列表项时调用，返回预览内容
  onSelect(item, query) {
    const el = document.createElement('pre')
    el.textContent = item.content
    return el  // 返回 HTMLElement 作为预览
  },

  // 用户执行某个操作时调用
  async onAction(item, action, query) {
    if (action.name === 'copy') {
      clipboard.writeText(item.content)
      await mainWindow.hide()
      clipboard.paste()
    }
  },

  // 视图隐藏时调用
  onHide() {
    // 清理资源
  }
}

export default listView
```

### IListViewCommand 接口

```ts
interface IListViewCommand<Item extends IResultItem = IResultItem> {
  onShow?(query: string, options: ICommandActionOptions | undefined | null, setList: (list: Item[]) => void): void
  onHide?(): void
  onSearch?(keyword: string, setList: (list: Item[]) => void): void | Promise<void>
  onSelect?(result: Item, query: string): string | HTMLElement | Promise<string> | Promise<HTMLElement>
  onAction?(result: Item, action: IAction, query: string): void | Promise<void>
}
```

### IResultItem 接口

列表项数据结构：

```ts
interface IResultItem {
  title: string          // 标题（必填）
  subtitle?: string      // 副标题
  icon?: string          // 图标 URL
  actions?: IAction[]    // 可用操作列表
  [x: string]: any       // 其他自定义字段
}
```

### 内置行为

listView 模式内置了以下用户交互行为，无需额外处理：

- 上下方向键选择列表项
- Enter 键执行第一个 action
- Shift+Enter 显示/隐藏操作面板
- Meta+数字键 快速选择可见区域中的列表项
- 列表项自带的快捷键 action（如 `action.shortcut`）

---

## view 模式

使用自定义 HTML/Vue 页面作为命令的 UI，适用于需要复杂表单或自定义界面的场景。

### 配置

```json
{
  "publicPlugin": {
    "html": "./dist/index.html",
    "commands": [
      {
        "name": "create-snippet",
        "title": "Create Snippet",
        "mode": "view",
        "matches": [{ "type": "text", "keywords": ["create snippet"] }]
      }
    ]
  }
}
```

### 实现

使用 Vite 构建一个标准的 Vue/Web 应用。在应用入口通过 `createPlugin` 注册生命周期钩子：

```ts
// src/App.vue
import { createPlugin } from '@public-tauri/api'

createPlugin({
  onEnter(command, query, options) {
    // 命令被触发时调用
    console.log('进入命令:', command.name)
  },
  onExit(command) {
    // 命令退出时调用
    console.log('退出命令:', command.name)
  }
})
```

> **注意**：view 模式运行在 wujie 微前端沙箱中，通过 `window.$wujie` 与宿主应用通信。`@public-tauri/api` 已封装好这些细节，直接使用即可。

### view 模式可用 API

在 view 模式下，以下 API 通过 wujie props 传递，可以直接从 `@public-tauri/api` 导入使用：

- `clipboard` - 剪贴板操作
- `dialog` - 弹窗和通知
- `mainWindow` - 窗口控制
- `fetch` - 网络请求（绕过 CORS）
- `utils` - 系统工具
- `screen` - 屏幕操作
- `Database` - SQLite 数据库
- `storage` - 插件本地存储（命名空间隔离）
- `showSaveFilePicker` - 文件保存对话框
- `fs` - 文件系统操作
- `shell` - Shell 命令执行
- `opener` - 打开外部链接/文件
- `resolveFileIcon` - 获取文件图标
- `resolveLocalPath` - 解析本地路径
- `invoke` - 调用服务端方法
- `on` - 监听服务端事件

> **不可用**：`createPluginChannel` 在 view 模式下不可用，请使用 `invoke` 和 `on` 替代。

### 也可使用内置 Vue 组件

view 模式的插件也可以使用 `@public-tauri/api/components` 提供的 Vue 组件来快速构建列表视图：

```vue
<template>
  <div class="snippets-list-view">
    <CommandListView :command="searchCommand"></CommandListView>
  </div>
</template>

<script setup lang="ts">
import { storage, type IListViewCommand } from '@public-tauri/api'
import CommandListView from '@public-tauri/api/components/CommandListView.vue'

const searchCommand: IListViewCommand = {
  async onShow(query, _, setList) {
    const list = await storage.getItem('my-data') || []
    setList(list.map(item => ({ title: item.name, icon: item.icon })))
  },
  // ...
}
</script>
```

详见 [组件参考](./components.md)。
