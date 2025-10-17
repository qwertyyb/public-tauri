<script setup lang="ts">
import CommandListView from '@public/plugin/CommandListView.vue';
import { createPlugin, type IPluginCommandListView } from '@public/plugin';
import { shallowRef } from 'vue';

const commands = shallowRef<{ [x: string]: IPluginCommandListView }>();
const commandName = shallowRef('');
const query = shallowRef('');

createPlugin({
  onEnter(command, keyword?: string) {
    commandName.value = command.name;
    query.value = keyword ?? '';
  },
  onExit() {
    commandName.value = '';
  },
});

const loadCommands = async () => {
  const results = await Promise.all(window.$commands.map(async (item) => {
    const module = await import(item.url);
    return { ...item, command: module.default };
  }));
  commands.value = results.reduce((acc, item) => ({ ...acc, [item.name]: item.command }), {});
};

loadCommands();


</script>

<template>
  <CommandListView
    v-if="commands?.[commandName]"
    :command="commands[commandName]!"
    :default-query="query"
  />
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
