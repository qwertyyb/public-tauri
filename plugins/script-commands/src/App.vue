<script setup lang="ts">
import CreateScriptCommand from './CreateScriptCommand.vue';
import ScriptCommandListView from './ScriptCommandListView.vue';
import { createPlugin } from '@public-tauri/api'
import { ref } from 'vue';

const command = ref('')

createPlugin({
  onEnter(params: { name: string }) {
    command.value = params.name
  },
  onExit() {
    command.value = ''
  }
})
</script>
<template>
  <CreateScriptCommand v-if="command === 'create-script-command'" />
  <ScriptCommandListView v-else-if="command === 'search-script-command'" />
</template>
<style>
:root {
  color-scheme: light dark;
}
</style>
