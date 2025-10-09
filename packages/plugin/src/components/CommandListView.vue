<template>
  <div class="command-list-view">
    <InputBar
      v-if="command.search"
      v-model="keyword"
      @escape="exitCommand"
    />
    <LoadingBar v-if="loadingCount > 0" />
    <EmptyView
      v-if="!loadingCount && !results.length"
      class="empty-view"
    />
    <ResultView
      v-show="results.length"
      class="result-view"
      :results="results"
      :preview="preview"
      @select="onResultSelected"
      @enter="onResultEnter"
      @action="onResultAction"
    />
  </div>
</template>

<script setup lang="ts">
import { debounce } from 'es-toolkit';
import ResultView from './PublicList.vue';
import InputBar from './InputBar.vue';
import EmptyView from './PublicListEmptyView.vue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import LoadingBar from './LoadingBar.vue';
import type { IPluginCommandListView, IListItem, IActionItem } from '@public/types';
import { mainWindow } from '../api';

const props = defineProps<{
  command: IPluginCommandListView,
  params?: { query?: string },
}>();

const keyword = ref(props.params?.query ?? '');
const results = ref<IListItem[]>([]);
const preview = ref<string | HTMLElement | undefined>('');

const loadingCount = ref(0);

if (typeof props.command?.enter === 'function') {
  loadingCount.value += 1;
  const origin = keyword.value ?? '';
  props.command?.enter?.(keyword.value ?? '', (list) => {
    loadingCount.value -= 1;
    if (origin !== (keyword.value ?? '')) return;
    results.value = list.map(item => ({
      ...item,
      icon: item.icon,
    }));
  });
}

watch(keyword, debounce((value: string) => {
  if (!props.command?.search) return;
  loadingCount.value += 1;
  try {
    props.command?.search?.(value, (list) => {
      loadingCount.value -= 1;
      if (value !== keyword.value) return;
      results.value = list.map(item => ({
        ...item,
        icon: item.icon,
      }));
    });
  } catch {
    loadingCount.value -= 1;
  }
}, 500), { immediate: true });

const onResultEnter = (item: IListItem) => {
  props.command?.action?.(item);
};

const onResultSelected = async (item: IListItem | null) => {
  if (!item) {
    preview.value = '';
    return;
  }
  preview.value = await props.command?.select?.(item, keyword.value || '');
};

const onResultAction = (item: IListItem, _itemIndex: number, action: IActionItem) => {
  props.command.action?.(item, action);
};

const exitCommand = () => {
  mainWindow.popView();
};

const keyDownHandler = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && !props.command?.search) {
    // 没有搜索功能，则退出的实现交由此处
    event.preventDefault();
    exitCommand();
  }
};

onMounted(() => {
  if (!props.command?.search) {
    window.addEventListener('keyup', keyDownHandler);
  }
});

onBeforeUnmount(() => {
  props.command.leave?.();
  window.removeEventListener('keyup', keyDownHandler);
});
</script>

<style lang="scss" scoped>
.command-list-view {
  display: flex;
  flex-direction: column;
  height: 100%;
	color: light-dark(#444, #ccc);
  --nav-width: 36px;
  --input-bar-height: 48px;
  .result-view, .empty-view {
    padding-top: var(--input-bar-height, 48px);
    box-sizing: border-box;
  }
  // background-color: light-dark(#e5e8e8, #161616);
}
.command-list-view > :v-deep(*) {
  width: 100%;
}
</style>
