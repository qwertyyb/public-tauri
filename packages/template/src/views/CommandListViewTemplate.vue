<template>
  <CommandListView :command="command" v-if="command" />
</template>

<script setup lang="ts">
import CommandListView from '@public/plugin/CommandListView.vue'
import type { IPluginCommandListView } from '@public/plugin';
import { markRaw } from 'vue';

declare global {
  interface Window {
    $public?: {
      command: IPluginCommandListView
    }
  }
}

const command = markRaw<IPluginCommandListView>(window.$public!.command)

</script>