# @public-tauri/icon

Public 应用内的统一图标协议解析与展示：把字符串（内置名、路径、`fileicon:` 等）解析成可渲染的内置字形或图片 URL，并由 Vue 组件 `AppIcon` 渲染。

## 安装

本仓库为 monorepo 私有包，在依赖方 `package.json` 中引用 workspace 版本即可。

## 导出

| 路径 | 说明 |
|------|------|
| `@public-tauri/icon` | 重导出 `types`、`resolver` |
| `@public-tauri/icon/AppIcon.vue` | 图标展示组件 |
| `@public-tauri/icon/resolver` | `resolveIcon` 等解析逻辑 |
| `@public-tauri/icon/types` | TypeScript 类型 |

## `AppIcon` 组件

```vue
<script setup lang="ts">
import AppIcon from '@public-tauri/icon/AppIcon.vue';
</script>

<template>
  <AppIcon icon="search" :size="20" color="var(--ui-primary)" />
</template>
```

### Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `icon` | `string \| undefined` | 图标字符串，格式由 `resolveIcon` 支持（内置 Material 名、资源路径、`fileicon:` 等） |
| `basePath` | `string \| undefined` | 解析相对路径时的基准目录 |
| `size` | `number \| string \| undefined` | 宽高与字号；数字为像素，字符串可为任意 CSS 长度 |
| `color` | `string \| undefined` | CSS `color` 值，用于内置 Material Symbols 的着色 |

未传入 `icon` 时不渲染任何内容。

### 关于 `color`

- **内置图标**（`builtin`）：通过内联样式设置 `color`，随主题或父级变量（如 `var(--ui-text-muted)`）即可统一调色。
- **图片图标**（`image`）：浏览器不会对 `<img>` 应用 `color`；若需着色请使用自带配色的资源，或在业务侧用 mask / 替换资源等方式处理。

## `resolveIcon`

在不需要组件、仅需解析出 `{ type, name }` 或 `{ type, url, darkUrl }` 时可直接调用 `resolveIcon(icon, { basePath, size })`，详见 `src/resolver.ts` 与 `src/types.ts`。
