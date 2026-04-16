# 插件配置清单

插件的所有配置信息均在 `package.json` 文件的 `publicPlugin` 字段中声明。以下是所有可用字段的完整说明。

## 完整结构

```json
{
  "name": "my-plugin",
  "publicPlugin": {
    "title": "插件标题",
    "subtitle": "插件简短描述",
    "description": "插件完整描述",
    "icon": "./assets/icon.png",
    "main": "dist/index.js",
    "server": "dist/server.js",
    "template": "listView",
    "html": "./dist/index.html",
    "preferences": [...],
    "commands": [...]
  }
}
```

## 字段说明

### `name`

- **类型**：`string`（继承自 `package.json` 的 `name` 字段）
- **必填**：是
- **说明**：插件的唯一标识名，需保持简短且与 URL 兼容。
- **注意**：此字段不直接在 `publicPlugin` 中配置，而是使用 `package.json` 的 `name` 字段。

### `title`

- **类型**：`string`
- **必填**：是
- **最大长度**：60 字符
- **说明**：插件标题，会在应用商店和偏好设置中显示给用户。

### `subtitle`

- **类型**：`string`
- **必填**：否
- **最大长度**：100 字符
- **说明**：插件的简短描述，用于快速说明插件的功能。

### `description`

- **类型**：`string`
- **必填**：否
- **说明**：对插件的完整描述，将在应用商店中显示给用户。

### `icon`

- **类型**：`string`
- **必填**：是
- **说明**：引用 `assets` 文件夹中的图标文件。使用 PNG 格式，建议尺寸为 512 x 512 像素。
- **主题适配**：支持明暗主题，请添加两个图标：
  - `icon.png` - 亮色主题
  - `icon@dark.png` - 暗色主题

### `main`

- **类型**：`string`
- **必填**：否
- **说明**：入口 JavaScript 文件路径，此文件会在主进程中执行。
- **用途**：适用于内置插件模式，用于定义 `onInput`、`onEnter` 等生命周期钩子。

### `server`

- **类型**：`string`
- **必填**：否
- **说明**：服务端 JavaScript 文件路径，此文件会在 Node.js 服务端运行。
- **用途**：适用于需要服务端能力的插件，如文件系统操作、系统命令执行等。详见 [服务端插件](./server-side.md)。

### `template`

- **类型**：`"listView"`
- **必填**：否
- **说明**：使用内置模板。目前仅支持 `listView`（列表视图模板）。
- **约束**：`template` 与 `html` 只能填写一个。

### `html`

- **类型**：`string`
- **必填**：否
- **说明**：HTML 入口文件路径，指向构建后的 HTML 文件（如 `./dist/index.html`）。
- **用途**：适用于需要自定义 Vue/Web 页面的插件。详见 [插件模式](./modes.md) 中的 view 模式。
- **约束**：`html` 与 `template` 只能填写一个。

### `preferences`

- **类型**：`IPreference[]`
- **必填**：否
- **说明**：插件级别的偏好设置列表。详见 [偏好设置](./preferences.md)。

### `commands`

- **类型**：`ICommand[]`
- **必填**：条件必填（当没有 `main` 字段时必须有 `commands`）
- **说明**：插件支持的命令列表。每个命令定义了独立的触发条件和行为。详见 [命令与匹配规则](./commands.md)。

## 配置校验规则

`publicPlugin` 字段会经过严格的 Schema 校验，以下规则必须满足：

1. **`template` 和 `html` 互斥**：两者只能填写一个，不能同时存在。
2. **`commands` 和 `main` 至少一个**：如果 `commands` 为空或未定义，则必须有 `main` 字段。
3. **`template` 为 `listView` 时**：命令的 `mode` 只能为 `listView` 或 `none`。
4. **`html` 有值时**：命令的 `mode` 只能为 `view` 或 `none`。
