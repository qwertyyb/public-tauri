<template>
  <div
    ref="el"
    class="public-list"
  >
    <div class="virtual-list-container">
      <VList
        ref="virtualList"
        v-slot="{ item, index }"
        class="result-list"
        :data="results"
        :keeps="30"
        :item-size="54"
      >
        <ListItem
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
      </VList>
    </div>
    <!-- <ActionList
      v-if="visibleActionIndex === selectedIndex && (selectedItem?.actions?.length || 0) > 0"
      :actions="selectedItem.actions!"
      @action="onResultAction"
    /> -->
    <ResultItemPreview
      v-if="results.length && preview"
      :html="preview"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends IListItem">
import { computed, onBeforeMount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { VList } from 'virtua/vue';
import ListItem from './PublicListItem.vue';
// import ActionList, { type IActionItem } from '@/components/ActionList.vue';
import type { IActionItem } from '@public/types';
import ResultItemPreview from './PublicListItemDetail.vue';
import { isKeyPressed } from '@public/api/utils';
import type { IListItem } from '@public/types';

const props = defineProps<{
  results: T[],
  preview?: string | HTMLElement
}>();

const emit = defineEmits<{
  enter: [item: T, index: number],
  select: [item: T | null, index: number],
  action: [item: T, index: number, action: IActionItem]
}>();

const selectedIndex = ref(0);
const visibleActionIndex = ref(-1);
const actionKeyStartIndex = ref(0);

const selectedItem = computed(() => props.results[selectedIndex.value]);

const el = useTemplateRef('el');
const virtualList = useTemplateRef('virtualList')

const getPreview = async (item: T) => {
  if (!item) return emit('select', null, -1);
  emit('select', item, selectedIndex.value);
};

// selectedIndex 变化时，滚动到选择位置，调用preview
const calcActionKeyStartIndex = () => {
  if (!el.value) return;
  (el.value.querySelector<HTMLElement>(`.result-item[data-result-item-index="${selectedIndex.value}"]`) as any)?.scrollIntoView({ inline: 'center', block: 'center', behavior: 'smooth' });
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
  actionKeyStartIndex.value = visibleIndexList[0];
};

watch(selectedItem, (value) => {
  visibleActionIndex.value = -1;
  virtualList.value?.scrollToIndex(Math.max(0, selectedIndex.value - 4))
  getPreview(value);
}, { immediate: true });
watch(selectedItem, () => setTimeout(calcActionKeyStartIndex, 600), { flush: 'post' });

watch(() => props.results, () => {
  console.log('result'); selectedIndex.value = 0;
});

const onResultEnter = (index: number) => {
  emit('enter', props.results[index], index);
};

const highlightAction = (actionName: string) => {
  const actionEl = document.querySelector(`[data-action-name=${JSON.stringify(actionName)}]`);
  if (!actionEl) return;
  actionEl.classList.add('flash');
  setTimeout(() => {
    actionEl.classList.remove('flash');
  }, 400);
};

const onResultAction = (action: IActionItem) => {
  emit('action', selectedItem.value, selectedIndex.value, action);
  highlightAction(action.name);
};

const keydownHandler = (e: KeyboardEvent) => {
  if (isKeyPressed(e, 'ArrowUp')) {
    selectedIndex.value = (Math.max(0, selectedIndex.value - 1));
    e.stopPropagation();
    e.preventDefault();
  } else if (isKeyPressed(e, 'ArrowDown')) {
    selectedIndex.value = (Math.min(selectedIndex.value + 1, props.results.length - 1));
    console.log('selectedIndex', selectedIndex.value);
    e.stopPropagation();
    e.preventDefault();
  } else if (isKeyPressed(e, 'Shift+Enter')) {
    e.stopPropagation();
    e.preventDefault();
    visibleActionIndex.value = selectedIndex.value;
  } else if (isKeyPressed(e, 'Enter')) {
    e.stopPropagation();
    e.preventDefault();
    onResultEnter(selectedIndex.value);
  } else if (e.metaKey && /^\d$/.test(e.key)) {
    const key = parseInt(e.key, 10);
    selectedIndex.value = actionKeyStartIndex.value + key - 1;
    onResultEnter(selectedIndex.value);
    e.stopPropagation();
  } else if (selectedItem.value?.actions) {
    const actions = [...selectedItem.value?.actions ?? []];
    const action = actions.find(action => action.shortcut && isKeyPressed(e, action.shortcut));
    if (!action) return;
    onResultAction(action);
  }
};

const getActionKey = (index: number, indexStart: number) => {
  const key = index - indexStart + 1;
  if (key > 0 && key <= 9) return String(key);
  return '';
};

onMounted(() => {
  document.addEventListener('keydown', keydownHandler);
});
onBeforeMount(() => {
  document.removeEventListener('keydown', keydownHandler);
});

</script>

<style lang="scss" scoped>
.public-list {
  height: 100%;
  display: flex;
  --container-height: 486px;
}
.virtual-list-container {
  flex: 3;
  height: var(--container-height, 100%);
}
.result-list {
  max-height: var(--container-height, 100%);
  min-height: var(--container-height, 100%);
  overflow: auto;
  height: var(--container-height, 100%);
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
