<template>
  <div class="command-list-view">
    <LoadingBar :loading="loadingCount > 1" />
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
// import InputBar from './InputBar.vue';
import EmptyView from './PublicListEmptyView.vue';
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import LoadingBar from './LoadingBar.vue';
import type { IListViewCommand, IResultItem, IAction, ICommandActionOptions } from '@public/schema';
import { mainWindow } from '../index';

const props = defineProps<{
  command: IListViewCommand,
  defaultQuery?: string,
  options?: ICommandActionOptions
}>();

const keyword = ref(props.defaultQuery ?? '');
const results = ref<IResultItem[]>([]);
const preview = ref<string | HTMLElement | undefined>('');

const loadingCount = ref(0);

if (typeof props.command?.onShow === 'function') {
  loadingCount.value += 1;
  const origin = keyword.value ?? '';
  props.command?.onShow?.(keyword.value ?? '', props.options, (list) => {
    loadingCount.value -= 1;
    if (origin !== (keyword.value ?? '')) return;
    results.value = list.map(item => ({
      ...item,
      icon: item.icon,
    }));
  });
}

watch(keyword, debounce((value: string) => {
  if (!props.command?.onSearch) return;
  loadingCount.value += 1;
  try {
    props.command?.onSearch?.(value, (list) => {
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

const onResultEnter = (item: IResultItem) => {
  props.command?.onAction?.(item, item.actions![0], keyword.value || '');
};

const onResultSelected = async (item: IResultItem | null) => {
  if (!item) {
    preview.value = '';
    window.$wujie?.props?.events.dispatchEvent(new CustomEvent('updateActions', { detail: { actions: [] } }));
    return;
  }

  const actions = (toRaw(item.actions) || []).map(a => ({
    ...a,
    action: () => props.command?.onAction?.(item, a, keyword.value || ''),
  }));

  window.$wujie?.props?.events.dispatchEvent(new CustomEvent('updateActions', { detail: { actions } }));
  preview.value = await props.command?.onSelect?.(item, keyword.value || '');
};

const onResultAction = (item: IResultItem, _itemIndex: number, action: IAction) => {
  props.command.onAction?.(item, action, keyword.value || '');
};

const exitCommand = () => {
  mainWindow.popView();
};

const keyDownHandler = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && !props.command?.onSearch) {
    // 没有搜索功能，则退出的实现交由此处
    event.preventDefault();
    exitCommand();
  }
};

const searchHandler = (event: CustomEvent<{ keyword: string }>) => {
  keyword.value = event.detail.keyword;
};

onMounted(() => {
  window.$wujie?.props?.events.addEventListener('search', searchHandler);
  window.$wujie?.props?.events.dispatchEvent(new CustomEvent('search-bar', { detail: { visible: typeof props.command.onSearch === 'function' } }));
  if (!props.command?.onSearch) {
    window.addEventListener('keyup', keyDownHandler);
  }
});

onBeforeUnmount(() => {
  props.command.onHide?.();
  window.removeEventListener('keyup', keyDownHandler);
  window.$wujie?.props?.events.removeEventListener('search', searchHandler);
});
</script>

<style lang="scss" scoped>
.command-list-view {
  display: flex;
  flex-direction: column;
  height: 100%;
	color: light-dark(#444, #fff);
  --nav-width: 36px;
  position: relative;
  .result-view, .empty-view {
    box-sizing: border-box;
  }
  // background-color: light-dark(#e5e8e8, #161616);
}
.command-list-view > :v-deep(*) {
  width: 100%;
}
</style>
