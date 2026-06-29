/**
 * List 的搜索栏桥接：在 wujie 宿主内由外层 InputBar 渲染真正的搜索 UI，子应用通过 props 同步状态。
 */
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  enabled: boolean;
  value: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:value': [string];
}>();

/** 每次访问读取最新 `$wujie.props`（与 React 版 `bridgeRef.current = getHostSearchBridge()` 一致） */
const hostBridge = window.$wujie?.props;

watch(
  () => props.enabled,
  (enabled) => {
    hostBridge?.updateSearchBarVisible?.(enabled);
  },
  { immediate: true },
);

watch(
  () => props.value,
  (value) => {
    hostBridge?.updateSearchBarValue?.(value);
  },
);

watch(
  () => props.placeholder,
  (placeholder) => {
    hostBridge?.updateSearchBarPlaceholder?.(placeholder);
  },
);

const valueMirror = ref(props.value);
watch(
  () => props.value,
  (v) => {
    valueMirror.value = v;
  },
);

const searchHandler = (event: Event) => {
  const keyword = String((event as CustomEvent<{ keyword?: string }>).detail?.keyword ?? '');
  if (keyword === valueMirror.value) return;
  valueMirror.value = keyword;
  emit('update:value', keyword);
};

watch(
  () => props.enabled,
  (enabled) => {
    hostBridge?.updateSearchBarVisible?.(enabled);
  },
);

onMounted(() => {
  if (hostBridge) {
    hostBridge.events.addEventListener('search', searchHandler);
    hostBridge.updateSearchBarVisible(props.enabled);
    hostBridge?.updateSearchBarValue?.(props.value);
    hostBridge?.updateSearchBarPlaceholder?.(props.placeholder);
  }
});

onBeforeUnmount(() => {
  if (hostBridge) {
    hostBridge.events.removeEventListener('search', searchHandler);
    hostBridge.updateSearchBarVisible(false);
  }
});

function onInput(ev: Event) {
  const text = (ev.target as HTMLInputElement).value;
  valueMirror.value = text;
  emit('update:value', text);
}
</script>

<template>
  <template v-if="props.enabled">
    <div
      v-if="!hostBridge"
      class="rv-raycast-list-search-row"
    >
      <input
        type="search"
        class="rv-raycast-list-search-input"
        :placeholder="placeholder"
        :value="value"
        :aria-label="placeholder ?? 'Search'"
        @input="onInput"
      >
    </div>
  </template>
</template>

<style scoped>
.rv-raycast-list-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rv-raycast-list-search-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  font-size: 13px;
  font-family: var(--rv-font);
  color: var(--rv-text);
  background: var(--rv-surface-elevated);
  border: 1px solid var(--rv-border);
  border-radius: 6px;
}

.rv-raycast-list-search-input:focus {
  outline: none;
  border-color: rgba(10, 132, 255, 0.55);
}
</style>
