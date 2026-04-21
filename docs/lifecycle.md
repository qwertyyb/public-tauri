# 生命周期 API

插件通过实现生命周期钩子来响应各种用户交互事件。钩子的可用性取决于插件模式。

## IPluginLifecycle

```ts
interface IPluginLifecycle {
  onInput?(keyword: string): void | ICommand[] | Promise<void> | Promise<ICommand[]>
  onSelect?(command: ICommand, query: string, options: ICommandActionOptions): string | undefined | HTMLElement | Promise<string | HTMLElement | undefined>
  onExit?(command: ICommand): void
  onAction?(command: ICommand, action: IAction, keyword: string, options?: ICommandActionOptions): void | Promise<void>
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

### `onAction(command, action, keyword, options?)`

用户确认执行命令时统一走此钩子：搜索框按 Enter、ActionBar 主操作、以及具名次要操作均调用 `onAction`，通过 `action` 区分。

- **参数**：
  - `command: ICommand` - 被触发的命令对象
  - `action: IAction` - 当前执行的操作（manifest 中 `commands[].actions[]` 的一项；若无 `actions`，宿主会使用命令自身合成的默认操作）
  - `keyword: string` - 与本次结果关联的查询串（含义与匹配方式一致，见 `onSelect`）
  - `options?: ICommandActionOptions` - 匹配来源与结果（搜索命中时通常有；快捷键等场景可能较简）
- **可用模式**：所有模式

单操作插件可不解析 `action.name`，多操作插件按 `action.name` 分支即可。

```ts
onAction(command, action, keyword, options) {
  dialog.showToast(`执行: ${command.name} / ${action.name}`)
}
```

### `onSelect(command, query, options)`

当用户选中（非确认）某个命令时触发。

- **参数**：与 `onAction` 中 `command` / `query` / `options` 语义一致（仅无 `action`）
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

## ICommandActionOptions

`onAction` 与 `onSelect` 的 `options` 参数描述了命令的触发来源和匹配结果。

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
    onAction(command: ICommand, action, keyword: string, options?: any) {
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
  onAction(command, action, keyword, options) {
    // 命令进入时
  },
  onExit(command) {
    // 命令退出时
  }
})
```
