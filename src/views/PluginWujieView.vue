<template>
  <div class="plugin-wujie-view">
    <div
      ref="wujie"
      class="wujie-container"
    />
    <ActionBar :left-action-panel="leftActionPanel">
      <template #left-trigger>
        <img
          :src="command.icon || plugin.manifest.icon"
          alt=""
          class="command-icon"
        >
        <span class="command-title">{{ command.title }}</span>
      </template>
    </ActionBar>
  </div>
</template>

<script setup lang="ts">
import ActionBar, { type ActionPanel } from '@/components/ActionBar.vue';
import type { IRunningPlugin } from '@/types/plugin';
import type { ICommand } from '@public/schema';
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue';

const props = defineProps<{
  wujie: {
    // eslint-disable-next-line no-unused-vars
    mount:(el: HTMLElement) => any,
    unmount: () => any,
  },
  plugin: IRunningPlugin,
  command: ICommand,
}>();

const container = useTemplateRef('wujie');

const leftActionPanel = computed<ActionPanel>(() => ({
  title: props.plugin.manifest.title,
  actions: [
    {
      label: '配置命令',
      icon: 'settings',
    },
    {
      label: '配置插件',
      icon: 'settings',
    },
  ],
}));

onMounted(() => {
  props.wujie.mount(container.value!);
});

onBeforeUnmount(() => {
  props.wujie.unmount();
});
</script>

<style lang="scss" scoped>
.plugin-wujie-view {
  height: 100vh;
}
.wujie-container {
  height: calc(100% - 36px);
}
.command-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  user-select: none;
  -webkit-user-select: none;
}
.command-title {
  user-select: none;
  -webkit-user-select: none;
  font-size: 14px;
  opacity: 0.6;
}
</style>
