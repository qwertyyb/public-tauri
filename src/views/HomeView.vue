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
  </div>
</template>

<script setup lang="ts">
import InputBar from '@/components/InputBar.vue';
import ResultView from '@/components/ResultView.vue';
import * as service from '@/services';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import type { ICommand as IPluginCommand, IActionItem } from '@public/schema';

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
  preview.value = await service.select(toRaw(results.value[itemIndex]), input.value.keyword);
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

let unlistenFocusChange: UnlistenFn;

onMounted(async () => {
  window.addEventListener('plugin:showCommands', setPluginResults);
  window.addEventListener('publicApp.mainWindow.show', focusInput);
  unlistenFocusChange = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
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
