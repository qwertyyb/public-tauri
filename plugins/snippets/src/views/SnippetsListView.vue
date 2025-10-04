<template>
  <div class="snippets-list-view">
    <CommandListView :command="searchCommand"></CommandListView>
  </div>
</template>

<script setup lang="ts">
import { clipboard, mainWindow, storage, type IPluginCommandListView } from '@public/plugin';
import CommandListView from '@public/plugin/CommandListView.vue'
import { markRaw } from 'vue';
import icon from '../assets/snippets.png'

const search = async (keyword: string): Promise<{title: string, content: string}[]> => {
  const list: { title: string, content: string }[] = (await storage.getItem('snippets')) || []
  return list.filter(i => i.title.includes(keyword))
}

const searchCommand: IPluginCommandListView = markRaw({
  async enter(query, setList) {
    const snippets = await search(query)
    return setList(snippets.map(snippet => ({
      title: snippet.title,
      icon,
      content: snippet.content
    })))
  },

  async search(keyword, setList) {
    const snippets = await search(keyword);
    return setList(
      snippets.map((snippet) => ({
        title: snippet.title,
        icon,
        content: snippet.content,
      }))
    );
  },

  select(result, query) {
    const el = document.createElement("pre");
    el.textContent = result.content;
    el.style.cssText =
      "border-radius:6px;height:var(--preview-height);overflow:auto;box-sizing:border-box;margin:0";
    return el
  },

  async action(result, action) {
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