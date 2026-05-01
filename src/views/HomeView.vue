<template>
  <PublicLayout
    :right-action-panel="rightActionPanel"
    :main-action="mainAction"
    @panel-closed="focusInput"
  >
    <template #top>
      <InputBar
        v-model="input"
        class="input-bar"
        is-main-input
      />
    </template>
    <ResultView
      :results="results"
      :preview="preview"
      class="result-view"
      @select="onResultSelected"
      @action="onResultAction"
    />
  </PublicLayout>
</template>

<script setup lang="ts">
import InputBar from '@/components/InputBar.vue';
import ResultView from '@/components/ResultView.vue';
import PublicLayout from '@/components/PublicLayout.vue';
import { type ActionPanel } from '@/components/ActionBar.vue';
import * as service from '@/services';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import type { IAction, ICommand as IPluginCommand } from '@public-tauri/schema';
import type { ActionPanelAction } from '@/types/plugin';

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
  console.log('focusInput');
  const el = document.querySelector<HTMLInputElement>('#main-input');
  el?.focus();
};


const onResultSelected = async (_item: IPluginCommand | null, itemIndex: number) => {
  const item = toRaw(results.value[itemIndex]);
  preview.value = await service.select(item, input.value.keyword);
  if (!item) {
    mainAction.value = undefined;
    rightActionPanel.value = undefined;
    return;
  }

  console.log('selected', item);
  const { action } = item;
  if (item?.mode === 'none' || !item?.mode) {
    mainAction.value = action
      ? {
        ...action,
        action: () => onResultAction(item, itemIndex, action),
      }
      : {
        name: 'open-command',
        icon: 'open_in_new',
        title: '启动命令',
        action: () => service.enter(item, input.value.keyword),
      };
    rightActionPanel.value = undefined;
  } else {
    mainAction.value = {
      name: 'open-command',
      icon: 'open_in_new',
      title: '启动命令',
      action: () => service.enter(item, input.value.keyword),
    };
    rightActionPanel.value = action
      ? {
        title: item.title,
        actions: [{
          ...action,
          action: () => onResultAction(item, itemIndex, action),
        }],
      }
      : undefined;
  }
};

const onResultAction = async (item: IPluginCommand, _itemIndex: number, action: IAction) => {
  console.log('onResultActon', item);
  service.action(toRaw(item), toRaw(action), input.value.keyword);
};

declare global {
  // eslint-disable-next-line no-unused-vars
  interface WindowEventMap {
    'publicApp.mainWindow.show': CustomEvent<{}>;
  }
}

const rightActionPanel = ref<ActionPanel | undefined>();
const mainAction = ref<ActionPanelAction | undefined>();

let unlistenFocusChange: UnlistenFn;

onMounted(async () => {
  window.addEventListener('publicApp.mainWindow.show', focusInput);
  unlistenFocusChange = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    console.log('currentWindow onFocusChanged', focused);
    if (focused) {
      focusInput();
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('publicApp.mainWindow.show', focusInput);
  unlistenFocusChange?.();
});
</script>
