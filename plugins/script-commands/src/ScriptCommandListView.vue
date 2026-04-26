<template>
  <div class="script-command-list-view">
    <CommandListView :key="refreshKey" :command="searchCommand"></CommandListView>
  </div>
</template>

<script setup lang="ts">
import { dialog, opener, storage, type IListViewCommand, shell } from '@public-tauri/api';
import CommandListView from '@public-tauri/api/components/CommandListView.vue'
import { inject, markRaw, ref } from 'vue';
import icon from '../assets/icon.png'
import {
  getScriptExecutor,
  normalizeTemplate,
  type ScriptCommandOptions,
} from './scriptCommand'

type ScriptCommandsUi = {
  startEdit: (p: ScriptCommandOptions & { index: number }) => void
}

type ScriptCommandResult = ScriptCommandOptions & { commandIndex: number }

const scriptCommandsUi = inject<ScriptCommandsUi>('scriptCommandsUi')
const refreshKey = ref(0)

const bumpRefresh = () => {
  refreshKey.value += 1
}

const getFilteredCommands = async (keyword: string) => {
  const list: ScriptCommandOptions[] = (await storage.getItem('scriptCommands')) || []
  return list
    .map((command, index) => ({ command, index }))
    .filter(({ command }) => {
      const text = `${command.title} ${command.description || ''} ${command.path}`
      return text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
    })
}

const mapResults = (items: { command: ScriptCommandOptions; index: number }[]): ScriptCommandResult[] => {
  return items.map(({ command, index }) => ({
    ...command,
    template: normalizeTemplate(command.template),
    commandIndex: index,
    icon: command.icon || icon,
    subtitle: `${normalizeTemplate(command.template)} · ${command.path}`,
    actions: [
      { name: 'run', title: '运行' },
      { name: 'open', title: '打开脚本' },
      { name: 'edit', title: '修改' },
      { name: 'delete', title: '删除', styleType: 'danger' as const },
    ],
  }))
}

const searchCommand: IListViewCommand = markRaw({
  async onShow(query, _, setList) {
    const list = await getFilteredCommands(query)
    return setList(mapResults(list))
  },

  async onSearch(keyword, setList) {
    const list = await getFilteredCommands(keyword)
    return setList(mapResults(list))
  },

  onSelect(result) {
    const el = document.createElement("div");
    const title = document.createElement("div")
    title.textContent = result.title
    title.style.cssText = "font-weight:600;margin-bottom:8px;"
    const meta = document.createElement("div")
    meta.textContent = `${normalizeTemplate(result.template)} · ${result.path}`
    meta.style.cssText = "opacity:.72;margin-bottom:8px;"
    const description = document.createElement("pre")
    description.textContent = result.description || 'No description'
    description.style.cssText = "white-space:pre-wrap;margin:0;"
    el.append(title, meta, description)
    el.style.cssText =
      "border-radius:6px;height:var(--preview-height);overflow:auto;box-sizing:border-box;margin:0;padding:12px;";
    return el
  },

  async onAction(result, action) {
    if (action.name === 'run') {
      try {
        const executor = getScriptExecutor(result.template)
        const output = await shell.Command.create(executor.command, executor.args(result.path)).execute()
        const message = output.stdout || output.stderr || '执行成功'
        dialog.showToast(message)
      } catch (error) {
        dialog.showToast(`执行失败: ${error instanceof Error ? error.message : String(error)}`)
      }
      return
    }

    if (action.name === 'open') {
      opener.openPath(result.path)
      return
    }

    if (action.name === 'edit') {
      scriptCommandsUi?.startEdit({
        index: result.commandIndex,
        template: normalizeTemplate(result.template),
        title: result.title,
        description: result.description,
        icon: result.icon === icon ? '' : result.icon,
        path: result.path,
      })
      return
    }

    if (action.name === 'delete') {
      try {
        await dialog.showConfirm('确定删除该脚本命令？', '删除脚本命令')
      } catch {
        return
      }
      const list: ScriptCommandOptions[] = (await storage.getItem('scriptCommands')) || []
      const idx = result.commandIndex
      if (idx < 0 || idx >= list.length) {
        dialog.showToast('命令不存在')
        return
      }
      list.splice(idx, 1)
      await storage.setItem('scriptCommands', list)
      dialog.showToast('已删除')
      bumpRefresh()
    }
  }
})
</script>

<style lang="scss" scoped>
.script-command-list-view {
  height: 100vh;
}
</style>
