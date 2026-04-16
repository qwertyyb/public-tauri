<template>
  <div class="script-command-list-view">
    <CommandListView :command="searchCommand"></CommandListView>
  </div>
</template>

<script setup lang="ts">
import { clipboard, mainWindow, storage, type IListViewCommand, shell, dialog } from '@public-tauri/api';
import CommandListView from '@public-tauri/api/components/CommandListView.vue'
import { markRaw } from 'vue';
import icon from '../assets/icon.png'

const search = async (keyword: string): Promise<{title: string, path: string}[]> => {
  const list: { title: string, path: string }[] = (await storage.getItem('scriptCommands')) || []
  return list.filter(i => i.title.includes(keyword))
}

const searchCommand: IListViewCommand = markRaw({
  async onShow(query, _, setList) {
    const list = await search(query)
    return setList(list.map(item => ({
      ...item,
      icon,
    })))
  },

  async onSearch(keyword, setList) {
    const list = await search(keyword)
    return setList(list.map(item => ({
      ...item,
      icon,
    })))
  },

  onSelect(result, query) {
    const el = document.createElement("pre");
    el.textContent = result.path
    el.style.cssText =
      "border-radius:6px;height:var(--preview-height);overflow:auto;box-sizing:border-box;margin:0";
    return el
  },

  async onAction(result, action) {
    // await mainWindow.hide()
    // clipboard.writeText(result.content)
    // clipboard.paste()
    const output = await shell.Command.create('node', [result.path]).execute()
    console.log('output', output)
    dialog.showToast('执行成功, ' + output.stdout)
  }
})
</script>

<style lang="scss" scoped>
.script-command-list-view {
  height: 100vh;
}
</style>
