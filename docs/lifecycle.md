# 生命周期 API

插件通过实现生命周期钩子来响应各种用户交互事件。钩子的可用性取决于插件模式。

## IPluginLifecycle

```ts
interface IPluginLifecycle {
  onInput?(keyword: string): void | ICommand[] | Promise<void> | Promise<ICommand[]>
  onSelect?(command: ICommand, query: string, options: ICommandActionOptions): string | undefined | HTMLElement | Promise<string | HTMLElement | undefined>
  onEnter?(command: ICommand, query: string, options: ICommandActionOptions): void
  onExit?(command: ICommand): void
  onAction?(command: ICommand, action: IAction, keyword: string): void
}
```

## 钩子说明

### `onInput(keyword)`

当用户在搜索框中输入时触发。

- **参数**：`keyword: string` - 用户输入的文本
- **返回值**：
  - `void` / `undefined` - 不做处理
  - `ICommand[]` - 动态返回命令列表，用于实时搜索
- **可用模式**：none 模式（`main` 入口）

```ts
onInput(keyword) {
  if (!keyword) return
  return [
    { title: `搜索 "${keyword}"`, name: 'search', ... }
  ]
}
```

### `onEnter(command, query, options)`

当用户选中并确认（按 Enter）某个命令时触发。

- **参数**：
  - `command: ICommand` - 被触发的命令对象
  - `query: string` - 用户输入的查询文本
  - `options: ICommandActionOptions` - 匹配选项，包含匹配类型和匹配结果
- **可用模式**：所有模式

```ts
onEnter(command, query, options) {
  // 处理命令执行逻辑
  dialog.showToast(`执行命令: ${command.name}`)
}
```

### `onSelect(command, query, options)`

当用户选中（非确认）某个命令时触发。

- **参数**：同 `onEnter`
- **返回值**：
  - `string` - HTML 字符串作为预览内容
  - `HTMLElement` - DOM 元素作为预览内容
  - `undefined` - 不显示预览
- **可用模式**：none 模式（`main` 入口）

```ts
onSelect(command, query, options) {
  return `<div>预览: ${query}</div>`
}
```

### `onExit(command)`

当用户退出命令视图时触发。

- **参数**：`command: ICommand` - 被退出的命令对象
- **可用模式**：view 模式

```ts
// view 模式下
createPlugin({
  onExit(command) {
    // 清理资源、重置状态等
  }
})
```

### `onAction(command, action, keyword)`

当用户对某个搜索结果执行操作时触发（listView 模式下的 `onAction`）。

- **参数**：
  - `command: ICommand` - 当前命令
  - `action: IAction` - 被执行的操作
  - `keyword: string` - 当前的搜索关键词
- **可用模式**：none 模式（`main` 入口）

## ICommandActionOptions

`onEnter` 和 `onSelect` 的 `options` 参数描述了命令的触发来源和匹配结果。

```ts
type ICommandActionOptions =
  | { from: 'search', match: ICommandTextMatch, result: ICommandTextMatchResult }
  | { from: 'search', match: ICommandTriggerMatch, result: ICommandTriggerMatchResult }
  | { from: 'search', match: ICommandRegexpMatch, result: ICommandRegexpMatchResult }
  | { from: 'search', match: ICommandFullMatch, result: ICommandFullMatchResult }
  | { from: 'search', match: ICommandFileMatch, result: ICommandFileMatchResult }
  | { from: 'search' }
  | { from: 'hotkey' }
  | { from: 'redirect' }
```

- **`from`**：触发来源
  - `'search'` - 通过搜索匹配触发
  - `'hotkey'` - 通过快捷键触发
  - `'redirect'` - 通过重定向触发

## 使用 definePlugin

对于内置插件（`main` 入口），使用 `definePlugin` 包裹来获取额外的应用接口：

```ts
import { definePlugin } from '@public-tauri/api'
import type { ICommand } from '@public-tauri/api'

export default definePlugin(({ updateCommands, showCommands, getPreferences }) => {
  return {
    onEnter(command: ICommand, query: string, options: any) {
      const prefs = getPreferences()
      dialog.showToast(`Hello, ${prefs.name || 'World'}!`)
    }
  }
})
```

### definePlugin 回调参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `updateCommands` | `(commands: ICommand[]) => void` | 动态更新插件的命令列表 |
| `showCommands` | `(commands: ICommand[]) => void` | 立即显示搜索结果命令 |
| `getPreferences` | `() => Record<string, any>` | 获取当前插件的偏好设置值 |

## 使用 createPlugin

对于 view 模式插件（HTML 入口），使用 `createPlugin` 注册生命周期：

```ts
import { createPlugin } from '@public-tauri/api'

createPlugin({
  onEnter(command, query, options) {
    // 命令进入时
  },
  onExit(command) {
    // 命令退出时
  }
})
```
