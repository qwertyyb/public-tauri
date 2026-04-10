<template>
  <div class="home-view">
    <InputBar
      v-model="input"
      class="input-bar"
      is-main-input
    />
    <ResultView
      :results="results"
      :preview="preview"
      class="result-view"
      @select="onResultSelected"
      @enter="onResultEnter"
      @action="onResultAction"
    />
    <ActionBar
      :left-action-panel="leftActionPanel"
      :right-action-panel="rightActionPanel"
      :main-action="mainAction"
    />
  </div>
</template>

<script setup lang="ts">
import InputBar from '@/components/InputBar.vue';
import ResultView from '@/components/ResultView.vue';
import ActionBar, { type ActionPanel, type Action } from '@/components/ActionBar.vue';
import * as service from '@/services';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import type { ICommand as IPluginCommand, IActionItem } from '@public/schema';
import { useRouter } from '@/router';
import { showConfirm } from '@/utils/feedback';
import { exit } from '@tauri-apps/plugin-process';

const results = ref<IPluginCommand[]>([]);
const preview = ref<string | HTMLElement | undefined>('');
const input = ref<{ keyword: string, files: File[] }>({ keyword: '', files: [] });

watch(input, async (value) => {
  if (value) {
    results.value = await service.query(value) || [];
  } else {
    results.value = [];
  }
});

const focusInput = () => {
  const el = document.querySelector<HTMLInputElement>('#main-input');
  el?.focus();
};

const onResultEnter = (_item: IPluginCommand | null, itemIndex: number) => {
  service.enter(toRaw(results.value[itemIndex]), input.value.keyword);
};

const onResultSelected = async (_item: IPluginCommand | null, itemIndex: number) => {
  const item = toRaw(results.value[itemIndex]);
  preview.value = await service.select(item, input.value.keyword);
  console.log('item', item);
  // 将 item 的 actions 转换为 ActionPanel 格式
  if (item?.actions?.length) {
    const actionItems: Action[] = item.actions.map(a => ({
      icon: a.icon || 'extension',
      label: a.title || a.name,
      action: () => onResultAction(item, itemIndex, { name: a.name, icon: a.icon!, title: a.title || a.name, shortcut: a.shortcut }),
    }));
    // 第一个 action 作为 mainAction
    const [firstAction, ...restActions] = actionItems;
    mainAction.value = firstAction;
    // 其余的作为 rightActionPanel
    rightActionPanel.value = {
      actions: restActions,
    };
  } else {
    mainAction.value = undefined;
    rightActionPanel.value = undefined;
  }
};

const onResultAction = async (item: IPluginCommand, _itemIndex: number, action: IActionItem) => {
  service.action(toRaw(item), toRaw(action), input.value.keyword);
};

const setPluginResults = (e: CustomEvent<{ commands: IPluginCommand[] }>) => {
  const { commands } = e.detail || {};
  results.value = commands;
};

declare global {
  // eslint-disable-next-line no-unused-vars
  interface WindowEventMap {
    'publicApp.mainWindow.show': CustomEvent<{}>;
    'plugin:showCommands': CustomEvent<{ name: string, commands: IPluginCommand[] }>;
  }
}

const router = useRouter();

const quitApp = async () => {
  try {
    await showConfirm('Are you sure you want to quit Public?', 'Quit', { type: 'warning', confirmText: 'Quit', cancelText: 'Cancel' });
    await exit(0);
  } catch {
    // user cancelled
  }
};

const leftActionPanel: ActionPanel = {
  title: 'Public V1.0.0',
  actions: [
    { icon: 'settings', label: 'Settings', action: () => router?.pushView('/settings') },
    { icon: 'info', label: 'About Public', action: () => router?.pushView('/about') },
    { icon: 'exit_to_app', label: 'Quit Public', styleType: 'danger', action: quitApp },
  ],
};

const rightActionPanel = ref<ActionPanel | undefined>();
const mainAction = ref<Action | undefined>();

let unlistenFocusChange: UnlistenFn;

onMounted(async () => {
  window.addEventListener('plugin:showCommands', setPluginResults);
  window.addEventListener('publicApp.mainWindow.show', focusInput);
  unlistenFocusChange = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    console.log('currentWindow onFocusChanged', focused);
    if (focused) {
      focusInput();
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('plugin:showCommands', setPluginResults);
  window.removeEventListener('publicApp.mainWindow.show', focusInput);
  unlistenFocusChange?.();
});
</script>

<style lang="scss" scoped>
.home-view {
  display: flex;
  flex-direction: column;
  height: 100%;
	color: light-dark(#444, #ccc);
  // background-color: light-dark(#e5e8e8, #161616);
}
.home-view > :deep(*) {
  width: 100%;
}
</style>
