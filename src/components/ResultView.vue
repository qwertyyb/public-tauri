<template>
  <div
    ref="el"
    class="resultView"
  >
    <VirtualList
      ref="virtualList"
      v-slot="{ source: item, index }"
      class="result-list"
      :data-sources="results"
      :keeps="30"
      :estimate-size="54"
      :data-key="'title'"
      @scroll="scrollHandler"
    >
      <ResultItem
        :key="index"
        :index="index"
        :icon="item.icon"
        :title="item.title"
        :subtitle="item.subtitle"
        :selected="selectedIndex === index"
        :action-key="getActionKey(index, actionKeyStartIndex)"
        @select="selectedIndex = index;$emit('select', item, index)"
        @enter="selectedIndex = index;$emit('enter', item, index)"
      />
    </VirtualList>
    <ResultItemPreview
      v-if="results.length && preview"
      :html="preview"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends IResultItem">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import ResultItem from '@/components/ResultItem.vue';
import ResultItemPreview from '@/components/ResultItemPreview.vue';
import { isKeyPressed } from '@/utils/keyboard';
import type { IResultItem } from '@public/schema';
import { onPageEnter, onPageLeave } from '@/router';
import { ACTION_BAR_HEIGHT, DIVIDER_WIDTH, NAV_HEIGHT } from '@/const';

const props = withDefaults(defineProps<{
  results?: T[],
  preview?: string | HTMLElement | null
}>(), { results: () => [], preview: null });

const emit = defineEmits<{
  enter: [item: T, index: number],
  select: [item: T | null, index: number],
}>();

const selectedIndex = ref(0);
const actionKeyStartIndex = ref(0);

const selectedItem = computed(() => props.results[selectedIndex.value]);

const virtualList = useTemplateRef<{
  scrollToIndex:(_index: number) => void,
  scrollToOffset: (_offset: number) => void,
  getOffset: () => number,
    }>('virtualList');
const el = useTemplateRef('el');

const getPreview = async (item: T) => {
  if (!item) return emit('select', null, -1);
  emit('select', item, selectedIndex.value);
};

// selectedIndex 变化时，滚动到选择位置，调用preview
const calcActionKeyStartIndex = () => {
  if (!el.value) return;
  // (el.value.querySelector<HTMLElement>(`.result-item[data-result-item-index="${selectedIndex.value}"]`) as any)?.scrollIntoViewIfNeeded(false);
  const parentRect = el.value.querySelector('div.result-list')!.getBoundingClientRect();
  const els = el.value.querySelectorAll<HTMLElement>('.result-item[data-result-item-index]');
  const visibleIndexList: number[] = [];
  els.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const visible = rect.top + rect.height / 2 >= parentRect.top && rect.top + rect.height / 2 <= parentRect.bottom;
    if (visible) {
      visibleIndexList.push(parseInt(item.dataset.resultItemIndex as string, 10));
    }
  });
  if (!visibleIndexList.includes(selectedIndex.value)) {
    selectedIndex.value = visibleIndexList[0] || 0;
  }
  // eslint-disable-next-line prefer-destructuring
  actionKeyStartIndex.value = visibleIndexList[0];
};

watch(selectedItem, (value) => {
  getPreview(value);
}, { immediate: true });

watch(() => props.results, () => {
  selectedIndex.value = 0;
});

const scrollHandler = async () => {
  console.log('scrollHandler');
  await nextTick();
  calcActionKeyStartIndex();
};

const onResultEnter = (index: number) => {
  emit('enter', props.results[index], index);
};

const keydownHandler = (e: KeyboardEvent) => {
  if (isKeyPressed(e, 'ArrowUp')) {
    selectedIndex.value = (Math.max(0, selectedIndex.value - 1));
    nextTick(() => {
      const selectedDOM = el.value?.querySelector<HTMLElement>(`.result-item[data-result-item-index="${selectedIndex.value}"]`);
      if (!selectedDOM) return;
      const rect = selectedDOM.getBoundingClientRect();
      if (rect.top < NAV_HEIGHT + DIVIDER_WIDTH) {
        virtualList.value?.scrollToOffset(virtualList.value?.getOffset() + rect.top - NAV_HEIGHT - DIVIDER_WIDTH);
      }
    });
    e.stopPropagation();
    e.preventDefault();
  } else if (isKeyPressed(e, 'ArrowDown')) {
    selectedIndex.value = (Math.min(selectedIndex.value + 1, props.results.length - 1));
    nextTick(() => {
      const selectedDOM = el.value?.querySelector<HTMLElement>(`.result-item[data-result-item-index="${selectedIndex.value}"]`);
      if (!selectedDOM) return;
      const rect = selectedDOM.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - ACTION_BAR_HEIGHT - DIVIDER_WIDTH) {
        virtualList.value?.scrollToOffset(virtualList.value?.getOffset() + rect.bottom - window.innerHeight + ACTION_BAR_HEIGHT + DIVIDER_WIDTH);
      }
    });
    e.stopPropagation();
    e.preventDefault();
  } else if (isKeyPressed(e, 'Enter')) {
    e.stopPropagation();
    e.preventDefault();
    onResultEnter(selectedIndex.value);
  } else if (e.metaKey && /^\d$/.test(e.key)) {
    const key = parseInt(e.key, 10);
    selectedIndex.value = actionKeyStartIndex.value + key - 1;
    onResultEnter(selectedIndex.value);
    e.stopPropagation();
  }
};

const getActionKey = (index: number, indexStart: number) => {
  const key = index - indexStart + 1;
  if (key > 0 && key <= 9) return String(key);
  return '';
};

onPageEnter(() => {
  document.addEventListener('keydown', keydownHandler);
});
onPageLeave(() => {
  document.removeEventListener('keydown', keydownHandler);
});

</script>

<style lang="scss" scoped>
.resultView {
  display: flex;
  --container-height: 486px;
}
.result-list {
  flex: 3;
  max-height: var(--container-height);
  min-height: var(--container-height);
  overflow: auto;
  height: var(--container-height);
}

/* 滚动槽 */
::-webkit-scrollbar {
    width: 5px;
    height: 6px;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
}
/* 滚动条滑块 */
::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.3);
    border-radius: 9999px;
}
</style>
