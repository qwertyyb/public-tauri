<script setup lang="ts">
import CreateScriptCommand from './CreateScriptCommand.vue';
import EditScriptCommand from './EditScriptCommand.vue';
import ScriptCommandListView from './ScriptCommandListView.vue';
import { createPlugin } from '@public-tauri/api'
import { provide, ref } from 'vue';
import type { ScriptCommandOptions } from './scriptCommand'

const command = ref('')
const editScriptCommand = ref<(ScriptCommandOptions & { index: number }) | null>(null)

provide('scriptCommandsUi', {
  startEdit: (payload: ScriptCommandOptions & { index: number }) => {
    editScriptCommand.value = payload
    command.value = 'edit-script-command'
  },
  finishEdit: () => {
    editScriptCommand.value = null
    command.value = 'search-script-command'
  },
})

createPlugin({
  onAction(params: { name: string }) {
    command.value = params.name
    editScriptCommand.value = null
  },
  onExit() {
    command.value = ''
    editScriptCommand.value = null
  }
})
</script>
<template>
  <UApp>
    <CreateScriptCommand v-if="command === 'create-script-command'" />
    <EditScriptCommand
      v-else-if="command === 'edit-script-command' && editScriptCommand"
      :payload="editScriptCommand"
    />
    <ScriptCommandListView v-else-if="command === 'search-script-command'" />
  </UApp>
</template>
<style>
body {
  margin: 0;
  padding: 0;
}
:root {
  color-scheme: light dark;
}
</style>
