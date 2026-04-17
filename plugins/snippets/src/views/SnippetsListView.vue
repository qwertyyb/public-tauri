<template>
  <div class="snippets-list-view">
    <CommandListView :key="refreshKey" :command="searchCommand"></CommandListView>
  </div>
</template>

<script setup lang="ts">
import { clipboard, dialog, mainWindow, storage, type IListViewCommand } from '@public-tauri/api';
import CommandListView from '@public-tauri/api/components/CommandListView.vue'
import { inject, markRaw, ref } from 'vue';
import icon from '../assets/snippets.png'

type SnippetsUi = {
  startEdit: (p: { index: number; title: string; content: string }) => void
}

const snippetsUi = inject<SnippetsUi>('snippetsUi')
const refreshKey = ref(0)

const bumpRefresh = () => {
  refreshKey.value += 1
}

const search = async (keyword: string): Promise<{ title: string; content: string }[]> => {
  const list: { title: string; content: string }[] = (await storage.getItem('snippets')) || []
  return list.filter(i => i.title.includes(keyword))
}

const searchCommand: IListViewCommand = markRaw({
  async onShow(query, _, setList) {
    const list: { title: string; content: string }[] = (await storage.getItem('snippets')) || []
    const filtered = list
      .map((snippet, index) => ({ snippet, index }))
      .filter(({ snippet }) => snippet.title.includes(query))
    return setList(filtered.map(({ snippet, index }) => ({
      title: snippet.title,
      icon,
      content: snippet.content,
      snippetIndex: index,
      actions: [
        { name: 'paste', title: '粘贴' },
        { name: 'edit', title: '修改' },
        { name: 'delete', title: '删除', styleType: 'danger' as const },
      ],
    })))
  },

  async onSearch(keyword, setList) {
    const list: { title: string; content: string }[] = (await storage.getItem('snippets')) || []
    const filtered = list
      .map((snippet, index) => ({ snippet, index }))
      .filter(({ snippet }) => snippet.title.includes(keyword))
    return setList(
      filtered.map(({ snippet, index }) => ({
        title: snippet.title,
        icon,
        content: snippet.content,
        snippetIndex: index,
        actions: [
          { name: 'paste', title: '粘贴' },
          { name: 'edit', title: '修改' },
          { name: 'delete', title: '删除', styleType: 'danger' as const },
        ],
      }))
    );
  },

  onSelect(result, query) {
    const el = document.createElement("pre");
    el.textContent = result.content;
    el.style.cssText =
      "border-radius:6px;height:var(--preview-height);overflow:auto;box-sizing:border-box;margin:0";
    return el
  },

  async onAction(result, action, _query) {
    if (action.name === 'paste') {
      await mainWindow.hide()
      clipboard.writeText(result.content)
      clipboard.paste()
      return
    }
    if (action.name === 'edit') {
      snippetsUi?.startEdit({
        index: result.snippetIndex as number,
        title: result.title,
        content: result.content,
      })
      return
    }
    if (action.name === 'delete') {
      try {
        await dialog.showConfirm('确定删除该片段？', '删除片段')
      } catch {
        return
      }
      const list: { title: string; content: string }[] = (await storage.getItem('snippets')) || []
      const idx = result.snippetIndex as number
      if (idx < 0 || idx >= list.length) {
        dialog.showToast('片段不存在')
        return
      }
      list.splice(idx, 1)
      await storage.setItem('snippets', list)
      dialog.showToast('已删除')
      bumpRefresh()
    }
  }
})
</script>

<style lang="scss" scoped>
.snippets-list-view {
  height: 100vh;
}
</style>
