<template>
  <PublicLayout
    :left-action-panel="leftActionPanel"
    class="plugin-view"
  >
    <template #top>
      <InputBar
        v-model="input"
        class="input-bar"
      />
    </template>
    <template #action-left-trigger>
      <img
        :src="command.icon || plugin.manifest.icon"
        alt=""
        class="command-icon"
      >
      <span class="command-title">{{ command.title }}</span>
    </template>
    <div
      ref="wujie"
      class="wujie-container"
    />
  </PublicLayout>
</template>

<script setup lang="ts">
import PublicLayout from '@/components/PublicLayout.vue';
import InputBar from '@/components/InputBar.vue';
import type { ActionPanel } from '@/components/ActionBar.vue';
import type { ActionPanelAction, IRunningPlugin } from '@/types/plugin';
import type { ICommand } from '@public/schema';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { onPageEnter, onPageLeave } from '@/router';

const props = defineProps<{
  wujie: {
    // eslint-disable-next-line no-unused-vars
    mount:(el: HTMLElement) => any,
    unmount: () => any,
  },
  plugin: IRunningPlugin,
  command: ICommand,
  events: EventTarget
}>();

const container = useTemplateRef('wujie');

const input = ref<{ keyword: string, files: File[] }>({ keyword: '', files: [] });

const leftActionPanel = computed<ActionPanel>(() => ({
  title: props.plugin.manifest.title,
  actions: [
    {
      name: 'config-command',
      title: '配置命令',
      icon: 'settings',
    },
    {
      name: 'config-plugin',
      title: '配置插件',
      icon: 'settings',
    },
  ],
}));

const mainAction = ref<ActionPanelAction>();

const rightActionPanel = ref<ActionPanel>();


const actionsUpdateHandler = (event: CustomEvent<{ actions: ActionPanelAction[], plugin: string }>) => {
  if (event.detail.plugin !== props.plugin.manifest.name) return;
  const [firstAction, ...restActions] = event.detail.actions;
  mainAction.value = firstAction;
  rightActionPanel.value = {
    title: '更多操作',
    actions: restActions,
  };
};

onMounted(() => {
  console.log('props', props);
  props.wujie.mount(container.value!);
});

onPageEnter(() => {
  // @ts-ignore
  props.events.addEventListener('updateActions', actionsUpdateHandler);
});

onPageLeave(() => {
  // @ts-ignore
  props.events.removeEventListener('updateActions', actionsUpdateHandler);
});

onBeforeUnmount(() => {
  props.wujie.unmount();
});
</script>

<style lang="scss" scoped>
.plugin-view {
  --nav-width: 36px;
}
.wujie-container {
  height: 100%;
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
