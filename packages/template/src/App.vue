<script setup lang="ts">
import CommandListView from '@public-tauri/api/components/CommandListView.vue';
import { type IListViewCommand, type ICommandActionOptions, createPlugin } from '@public-tauri/api';
import { shallowRef } from 'vue';

const commands = shallowRef<{ [x: string]: IListViewCommand }>();
const commandName = shallowRef('');
const query = shallowRef('');
const actionOptions = shallowRef<ICommandActionOptions>();

createPlugin({
  onEnter(command, keyword: string = '', options: ICommandActionOptions) {
    commandName.value = command.name;
    query.value = keyword ?? '';
    actionOptions.value = options;
  },
  onExit() {
    commandName.value = '';
    query.value = '';
    actionOptions.value = undefined;
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
    :key="commandName"
    :command="commands[commandName]!"
    :default-query="query"
    :options="actionOptions!"
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
