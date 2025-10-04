<script setup lang="ts">
import CommandListView from '@public/plugin/CommandListView.vue';
import { createPlugin, type IPluginCommandListView } from '@public/plugin';
import { shallowRef } from 'vue';

declare global {
  interface Window {
    $commands: { name: string, url: string }[]
  }
}

const commands = shallowRef<{ [x: string]: IPluginCommandListView }>()
const commandName = shallowRef('')

createPlugin({
  onEnter(command, matchData) {
    commandName.value = command.name
  },
  onExit() {
    commandName.value = ''
  },
})

const loadCommands = async () => {
  const results = await Promise.all(window.$commands.map(async (item) => {
    const module = await import(item.url)
    return { ...item, command: module.default }
  }))
  commands.value = results.reduce((acc, item) => {
    return { ...acc, [item.name]: item.command }
  }, {})
}

loadCommands()


</script>

<template>
  <CommandListView :command="commands[commandName]!" v-if="commands?.[commandName]" />
</template>

<style>
* {
	padding: 0;
	margin: 0;
  outline: none;
}
:root {
  color-scheme: light dark;
}
html, body, #app {
  height: 100%;
}
</style>
