<template>
  <div class="snippets-list-view">
    <CommandListView :command="searchCommand"></CommandListView>
  </div>
</template>

<script setup lang="ts">
import { clipboard, mainWindow, storage, type IListViewCommand } from '@public-tauri/api';
import CommandListView from '@public-tauri/api/components/CommandListView.vue'
import { markRaw } from 'vue';
import icon from '../assets/snippets.png'

const search = async (keyword: string): Promise<{title: string, content: string}[]> => {
  const list: { title: string, content: string }[] = (await storage.getItem('snippets')) || []
  return list.filter(i => i.title.includes(keyword))
}

const searchCommand: IListViewCommand = markRaw({
  async onShow(query, _, setList) {
    const snippets = await search(query)
    return setList(snippets.map(snippet => ({
      title: snippet.title,
      icon,
      content: snippet.content
    })))
  },

  async onSearch(keyword, setList) {
    const snippets = await search(keyword);
    return setList(
      snippets.map((snippet) => ({
        title: snippet.title,
        icon,
        content: snippet.content,
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

  async onAction(result, action) {
    await mainWindow.hide()
    clipboard.writeText(result.content)
    clipboard.paste()
  }
})
</script>

<style lang="scss" scoped>
.snippets-list-view {
  height: 100vh;
}
</style>