<template>
  <div class="command-list-view">
    <LoadingBar v-if="loadingCount > 0" />
    <ResultView
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
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import LoadingBar from './LoadingBar.vue';
import type { IPluginCommandListView, IPluginCommandConfig, IListItem, IActionItem } from '@public/types';

const props = defineProps<{
  command: IPluginCommandListView & IPluginCommandConfig,
  keyword?: string,
  params?: { query?: string },
}>();

const results = ref<IListItem[]>([]);
const preview = ref<string | HTMLElement | undefined>('');

const loadingCount = ref(0);

if (typeof props.command?.enter === 'function') {
  loadingCount.value += 1;
  const origin = props.keyword ?? '';
  props.command?.enter?.(props.keyword ?? '', (list) => {
    loadingCount.value -= 1;
    if (origin !== (props.keyword ?? '')) return;
    results.value = list.map(item => ({
      ...item,
      icon: item.icon,
    }));
  }, { command: toRaw(props.command) });
}

watch(() => props.keyword || '', debounce((value: string) => {
  if (!props.command?.search) return;
  loadingCount.value += 1;
  try {
    props.command?.search?.(value, (list) => {
      loadingCount.value -= 1;
      if (value !== props.keyword) return;
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
  preview.value = await props.command?.select?.(item, props.keyword || '');
};

const onResultAction = (item: IListItem, _itemIndex: number, action: IActionItem) => {
  props.command.action?.(item, action);
};

const exitCommand = () => {
  // router?.popView();
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
  // background-color: light-dark(#e5e8e8, #161616);
}
.command-list-view > :v-deep(*) {
  width: 100%;
}
</style>
