<script setup lang="ts">
import CommandListView from '@public-tauri/api/components/CommandListView.vue';
import { type IListViewCommand, type ICommandActionOptions, createPlugin, fetch as appFetch } from '@public-tauri/api';
import { shallowRef } from 'vue';

const commands = shallowRef<{ [x: string]: IListViewCommand }>();
const commandName = shallowRef('');
const query = shallowRef('');
const actionOptions = shallowRef<ICommandActionOptions>();

createPlugin({
  onAction(command, _action, keyword: string = '', options?: ICommandActionOptions) {
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

const loadOneCommandModule = async (url: string) => {
  // 先尝试浏览器原生动态导入；失败后降级为宿主 fetch + blob import（兼容某些 WebView 下跨域 module 限制）。
  try {
    return await import(/* @vite-ignore */ url);
  } catch (err) {
    console.warn('[template] direct import failed, fallback to appFetch+blob', url, err);
    const code = await appFetch(url).then(r => r.text());
    const blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    try {
      return await import(/* @vite-ignore */ blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }
};

const loadCommands = async () => {
  try {
    const results = await Promise.all(window.$commands.map(async (item) => {
      const module = await loadOneCommandModule(item.url);
      return { ...item, command: module.default };
    }));
    commands.value = results.reduce((acc, item) => ({ ...acc, [item.name]: item.command }), {});
  } catch (err) {
    console.error('[template] loadCommands failed', err);
    commands.value = {};
  }
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
