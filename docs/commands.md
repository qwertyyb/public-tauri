# 命令与匹配规则

每个插件可以定义一个或多个命令（Command）。命令是用户交互的基本单位，每个命令拥有独立的匹配规则、行为和 UI 模式。

## 命令基础结构

```json
{
  "name": "my-command",
  "title": "我的命令",
  "subtitle": "命令副标题",
  "description": "命令描述",
  "icon": "./assets/cmd-icon.png",
  "mode": "none",
  "preferences": [],
  "actions": [],
  "matches": []
}
```

## 字段说明

### `name`

- **类型**：`string`
- **必填**：是
- **说明**：命令在插件内的唯一标识名称。

### `title`

- **类型**：`string`
- **必填**：是
- **最大长度**：60 字符
- **说明**：命令标题，显示在搜索结果、偏好设置等位置。

### `subtitle`

- **类型**：`string`
- **必填**：否
- **最大长度**：100 字符
- **说明**：命令副标题，提供额外的描述信息。

### `description`

- **类型**：`string`
- **必填**：否
- **说明**：命令的详细描述，显示在应用商店中。

### `icon`

- **类型**：`string`
- **必填**：否
- **说明**：命令图标路径。如果不填写，则默认使用插件外层的 `icon` 字段。

### `mode`

- **类型**：`"listView" | "none" | "view"`
- **必填**：否
- **默认值**：`"none"`
- **说明**：命令的运行模式。
  - `none` - 无 UI，直接执行逻辑
  - `listView` - 使用内置列表视图展示搜索结果
  - `view` - 使用自定义 HTML 页面

### `preferences`

- **类型**：`IPreference[]`
- **必填**：否
- **说明**：命令级别的偏好设置，优先级高于插件级别。详见 [偏好设置](./preferences.md)。

### `actions`

- **类型**：`IAction[]`
- **必填**：否
- **说明**：命令可用动作列表，用于 listView 模式下列表项的操作按钮。

每个 action 的结构：

```json
{
  "name": "copy",
  "title": "复制",
  "icon": "./assets/copy.png",
  "styleType": "default"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | Action 的唯一标识 |
| `title` | `string` | 否 | 显示标题，默认使用 `name` |
| `icon` | `string` | 否 | 显示图标 |
| `styleType` | `"default" \| "warning" \| "danger"` | 否 | 样式类型 |

### `matches`

- **类型**：`ICommandMatch[]`
- **必填**：否
- **说明**：匹配规则列表，定义该命令如何被用户输入触发。支持五种匹配类型。

## 匹配规则

### 1. 文本匹配（text）

通过关键词模糊匹配用户输入。

```json
{
  "type": "text",
  "keywords": ["剪切板", "clipboard", "cp"]
}
```

- **`keywords`**：关键词列表，用于模糊搜索匹配。支持中文拼音匹配。

### 2. 触发器匹配（trigger）

当用户输入以触发器开头并加空格时触发匹配。

```json
{
  "type": "trigger",
  "triggers": ["cp"],
  "title": "搜索剪切板"$query"",
  "subtitle": "在剪切板历史中搜索"
}
```

- **`triggers`**：触发器列表。例如用户输入 `cp hello`，其中 `cp` 是触发器，`hello` 是 `$query`。
- **`title`**：匹配成功后显示的标题，支持 `$query` 变量。
- **`subtitle`**：匹配成功后显示的副标题，支持 `$query` 变量。

### 3. 完全匹配（full）

用户输入完全匹配时触发。

```json
{
  "type": "full",
  "title": "执行: $query",
  "subtitle": "正在处理你的请求"
}
```

- **`title`**：匹配成功后显示的标题，支持 `$query` 变量。
- **`subtitle`**：匹配成功后显示的副标题，支持 `$query` 变量。

### 4. 正则匹配（regexp）

使用正则表达式匹配用户输入。

```json
{
  "type": "regexp",
  "regexp": "^\\d+[a-zA-Z]+$",
  "title": "匹配到编码: ${0}",
  "subtitle": "编码类型"
}
```

- **`regexp`**：JavaScript 正则表达式字符串。
- **`title`**：支持模板字符串语法，可以使用捕获组变量 `${0}`、`${1}` 等。
- **`subtitle`**：同上。

### 5. 文件匹配（file）

匹配拖拽到搜索框的文件。

```json
{
  "type": "file",
  "extensions": [".jpg", ".png", ".gif"],
  "nameRegexp": "screenshot_.*",
  "isDirectory": false,
  "title": "处理图片",
  "subtitle": "$query"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `extensions` | `string[]` | 允许的文件扩展名列表 |
| `nameRegexp` | `string` | 文件名匹配的正则表达式 |
| `isDirectory` | `boolean` | 是否只匹配目录 |
| `title` | `string` | 匹配成功后显示的标题 |
| `subtitle` | `string` | 匹配成功后显示的副标题 |

## 匹配结果类型

不同的匹配类型会产生不同结构的匹配结果，传入生命周期钩子的 `options` 参数中：

| 匹配类型 | 结果类型 | 包含字段 |
|---------|---------|---------|
| `text` | `ICommandTextMatchResult` | `keyword: string` |
| `trigger` | `ICommandTriggerMatchResult` | `trigger: string, query: string` |
| `full` | `ICommandFullMatchResult` | `query: string` |
| `regexp` | `ICommandRegexpMatchResult` | `matches: RegExpMatchArray` |
| `file` | `ICommandFileMatchResult` | `file: AsyncFile` |

## 拼音匹配

中文关键词自动支持拼音匹配。例如，关键词 `"剪切板"` 会同时匹配：

- `剪切板`
- `jianqieban`（全拼）
- `jqb`（首字母缩写）
