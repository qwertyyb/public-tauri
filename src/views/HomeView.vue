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
import ActionBar from '@/components/ActionBar.vue';
import { type ActionPanel, type Action } from '@/components/ActionBar.vue';
import * as service from '@/services';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import type { ICommand as IPluginCommand, IActionItem } from '@public/schema';
import { useAppActionBar } from '@/composables/useAppActionBar';

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

  if (item?.mode === 'none' || !item?.mode) {
    if (item?.actions?.length) {
      const actionItems: Action[] = item.actions.map(a => ({
        icon: a.icon || 'extension',
        label: a.title || a.name,
        action: () => onResultAction(item, itemIndex, { name: a.name, icon: a.icon!, title: a.title || a.name, shortcut: a.shortcut }),
      }));
      const [firstAction, ...restActions] = actionItems;
      mainAction.value = firstAction;
      rightActionPanel.value = {
        title: item.title,
        actions: restActions,
      };
    } else {
      mainAction.value = undefined;
      rightActionPanel.value = undefined;
    }
  } else {
    mainAction.value = {
      icon: 'open_in_new',
      label: 'Open Command',
      action: () => service.enter(item, input.value.keyword),
    };
    if (item?.actions?.length) {
      rightActionPanel.value = {
        title: item.title,
        actions: item.actions.map(a => ({
          icon: a.icon || 'extension',
          label: a.title || a.name,
          action: () => onResultAction(item, itemIndex, { name: a.name, icon: a.icon!, title: a.title || a.name, shortcut: a.shortcut }),
        })),
      };
    } else {
      rightActionPanel.value = undefined;
    }
  }
};

const onResultAction = async (item: IPluginCommand, _itemIndex: number, action: IActionItem) => {
  console.log('onResultActon', item);
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

// ActionBar composable
const { leftActionPanel } = useAppActionBar();
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
  padding-bottom: var(--action-bar-height);
	color: light-dark(#444, #ccc);
  // background-color: light-dark(#e5e8e8, #161616);
}
.home-view > :deep(*) {
  width: 100%;
}
</style>
