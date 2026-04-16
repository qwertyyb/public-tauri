# 偏好设置

插件和命令都可以定义偏好设置（Preferences），允许用户在偏好设置面板中配置插件行为。

## 概述

偏好设置分为两个层级：

- **插件级别**：定义在 `publicPlugin.preferences` 中，对整个插件生效
- **命令级别**：定义在 `commands[].preferences` 中，仅对特定命令生效

当用户触发命令时，系统会检查：
1. 先检查插件级别的必填项（`required: true`）是否已填写
2. 再检查命令级别的必填项是否已填写
3. 如果有未填写的必填项，会自动跳转到偏好设置页面

## IPreference 结构

```ts
interface IPreference {
  name: string              // 偏好设置名称（必填）
  title?: string            // 显示标题（可选，默认使用 name）
  description?: string      // 描述文字，显示在输入框下方（可选）
  type: 'text'              // 表单类型（默认 'text'）
    | 'number'
    | 'textarea'
    | 'password'
    | 'select'
  required?: boolean        // 是否必填（默认 false）
  placeholder?: string      // 输入框占位符（可选）
  defaultValue?: any        // 默认值（可选）
  options?: Array<{         // 选项列表（type 为 'select' 时必填）
    label: string
    value: string | number | boolean
  }>
}
```

## 配置示例

### 插件配置

```json
{
  "publicPlugin": {
    "title": "翻译插件",
    "preferences": [
      {
        "name": "api_key",
        "title": "API Key",
        "description": "用于调用翻译服务的 API Key",
        "type": "password",
        "required": true,
        "placeholder": "请输入你的 API Key"
      },
      {
        "name": "target_lang",
        "title": "目标语言",
        "type": "select",
        "defaultValue": "en",
        "options": [
          { "label": "英语", "value": "en" },
          { "label": "日语", "value": "ja" },
          { "label": "韩语", "value": "ko" }
        ]
      },
      {
        "name": "max_results",
        "title": "最大结果数",
        "type": "number",
        "defaultValue": 10,
        "description": "搜索结果的最大显示数量"
      }
    ]
  }
}
```

### 命令配置

```json
{
  "commands": [
    {
      "name": "search",
      "title": "搜索",
      "preferences": [
        {
          "name": "search_engine",
          "title": "搜索引擎",
          "type": "select",
          "defaultValue": "google",
          "options": [
            { "label": "Google", "value": "google" },
            { "label": "Bing", "value": "bing" }
          ]
        }
      ]
    }
  ]
}
```

## 在插件中读取偏好设置

### main 模式

通过 `definePlugin` 的 `getPreferences` 回调获取：

```ts
import { definePlugin } from '@public-tauri/api'

export default definePlugin(({ getPreferences }) => {
  return {
    onEnter(command, query, options) {
      const prefs = getPreferences()
      // prefs 包含插件级别和当前命令的所有偏好设置值
      const apiKey = prefs.api_key
      const targetLang = prefs.target_lang
      console.log('用户配置:', apiKey, targetLang)
    }
  }
})
```

### view 模式

view 模式下，使用 `storage` API 读取，或通过 `mainWindow` 提供的工具方法。

### 服务端

在服务端模块中，可以通过读取插件设置来获取偏好值。

## 表单类型说明

| 类型 | 说明 | 适用场景 |
|------|------|---------|
| `text` | 单行文本输入框 | 短文本、URL、名称等 |
| `number` | 数字输入框 | 数量、大小等数值 |
| `textarea` | 多行文本输入框 | 长文本、代码片段等 |
| `password` | 密码输入框 | API Key、密钥等敏感信息 |
| `select` | 下拉选择框 | 枚举选项 |

## 校验规则

1. 当 `type` 为 `select` 时，`options` 数组必须至少有一个元素
2. 当 `required` 为 `true` 时，用户必须填写该字段才能使用插件/命令
3. 未设置 `required` 的字段用户可以跳过

## defaultValue

`defaultValue` 字段会在用户首次使用插件时自动填充。如果用户未修改，则偏好设置中存储该默认值。

> **注意**：`defaultValue` 的值可以是 `string`、`number`、`boolean` 或其他 JSON 可序列化的类型。
