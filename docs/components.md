# 组件参考

`@public-tauri/api` 提供了一组 Vue 组件，主要用于在 view 模式的插件中快速构建列表视图。

## 导入方式

```vue
<script setup lang="ts">
import CommandListView from '@public-tauri/api/components/CommandListView.vue'
import PublicList from '@public-tauri/api/components/PublicList.vue'
import PublicListItem from '@public-tauri/api/components/PublicListItem.vue'
import PublicListItemDetail from '@public-tauri/api/components/PublicListItemDetail.vue'
import PublicListEmptyView from '@public-tauri/api/components/PublicListEmptyView.vue'
import InputBar from '@public-tauri/api/components/InputBar.vue'
import LoadingBar from '@public-tauri/api/components/LoadingBar.vue'
</script>
```

---

## CommandListView

最常用的组件，封装了完整的列表视图，包括搜索、列表展示、预览、操作等功能。

### Props

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `command` | `IListViewCommand` | 是 | 列表命令对象，定义了所有行为 |
| `defaultQuery` | `string` | 否 | 初始搜索关键词 |
| `options` | `ICommandActionOptions` | 否 | 命令匹配选项 |

### 基本用法

```vue
<template>
  <div class="my-view">
    <CommandListView :command="searchCommand" />
  </div>
</template>

<script setup lang="ts">
import { storage, type IListViewCommand } from '@public-tauri/api'
import CommandListView from '@public-tauri/api/components/CommandListView.vue'

const searchCommand: IListViewCommand = {
  async onShow(query, _, setList) {
    const list = await loadData()
    setList(list.map(item => ({
      title: item.name,
      subtitle: item.description,
      icon: item.icon,
      actions: [
        { name: 'copy', title: '复制' },
        { name: 'delete', title: '删除', styleType: 'danger' },
      ],
    })))
  },

  async onSearch(keyword, setList) {
    const list = await search(keyword)
    setList(list)
  },

  onSelect(item, query) {
    const el = document.createElement('pre')
    el.textContent = item.content
    return el
  },

  async onAction(item, action, query) {
    if (action.name === 'copy') {
      // 执行复制操作
    }
  },
}
</script>
```

### 内置功能

CommandListView 自动处理以下交互：

- 搜索框输入与防抖（500ms）
- 上下方向键选择列表项
- Enter 执行第一个 action
- Shift+Enter 显示操作面板
- Meta+数字 快速选择
- 加载状态展示
- 空数据展示
- 选中项预览

---

## PublicList

底层列表组件，提供虚拟化列表渲染。通常不需要直接使用，`CommandListView` 已封装好。

### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `results` | `T[]` | 列表数据，每项需包含 `title` 字段 |
| `preview` | `string \| HTMLElement` | 预览内容 |

### Events

| Event | Payload | 说明 |
|-------|---------|------|
| `enter` | `(item: T, index: number)` | 用户确认选择列表项 |
| `select` | `(item: T \| null, index: number)` | 用户选中列表项 |
| `action` | `(item: T, index: number, action: IAction)` | 用户执行操作 |

---

## PublicListItem

单个列表项组件。

### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `icon` | `string` | 图标 URL |
| `title` | `string` | 标题 |
| `subtitle` | `string` | 副标题 |
| `index` | `number` | 列表索引 |
| `selected` | `boolean` | 是否选中 |
| `actionKey` | `string` | 快捷键提示（如 "1"-"9"） |

### Events

| Event | 说明 |
|-------|------|
| `select` | 点击选中 |
| `enter` | 双击确认 |

---

## PublicListItemDetail

预览区域组件，用于展示选中列表项的详情。

### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `html` | `string \| HTMLElement` | 预览内容，支持 HTML 字符串或 DOM 元素 |

---

## PublicListEmptyView

空数据占位组件。

### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `title` | `string` | 空状态标题，默认 "没有数据" |
| `description` | `string` | 空状态描述 |
| `icon` | `string` | 自定义图标 URL |

---

## InputBar

搜索输入框组件。

### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `disabled` | `boolean` | 是否禁用 |
| `placeholder` | `string` | 占位提示文字，默认 "Search..." |

### Model

| Model | 类型 | 说明 |
|-------|------|------|
| `v-model` | `string` | 输入框的值 |

### Events

| Event | 说明 |
|-------|------|
| `escape` | 用户按 Escape 或 Backspace（输入为空时） |

---

## LoadingBar

加载状态指示器组件。

### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `loading` | `boolean` | 是否显示加载状态 |

---

## 使用示例：在 view 模式中嵌入 CommandListView

```vue
<template>
  <div class="my-plugin-view">
    <CommandListView :command="myCommand" :defaultQuery="initialQuery" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createPlugin, mainWindow, clipboard, type IListViewCommand } from '@public-tauri/api'
import CommandListView from '@public-tauri/api/components/CommandListView.vue'

const initialQuery = ref('')

createPlugin({
  onEnter(command, query) {
    initialQuery.value = query || ''
  }
})

const myCommand: IListViewCommand = {
  async onShow(query, options, setList) {
    // 加载初始数据
    const data = await fetchMyData()
    setList(data.map(d => ({
      key: d.id,
      title: d.name,
      subtitle: d.description,
      icon: d.iconUrl,
      actions: [
        { name: 'copy-name', title: '复制名称' },
        { name: 'open', title: '打开' },
      ],
      // 可附带自定义数据
      originalData: d,
    })))
  },

  async onSearch(keyword, setList) {
    const data = await searchMyData(keyword)
    setList(data.map(d => ({
      key: d.id,
      title: d.name,
      subtitle: d.description,
      icon: d.iconUrl,
      actions: [
        { name: 'copy-name', title: '复制名称' },
        { name: 'open', title: '打开' },
      ],
      originalData: d,
    })))
  },

  onSelect(item) {
    // 返回预览内容
    const el = document.createElement('div')
    el.innerHTML = `<h3>${item.title}</h3><p>${item.subtitle || ''}</p>`
    return el
  },

  async onAction(item, action) {
    if (action.name === 'copy-name') {
      await clipboard.writeText(item.title)
    } else if (action.name === 'open') {
      await mainWindow.hide()
      // 执行打开操作
    }
  }
}
</script>
```
