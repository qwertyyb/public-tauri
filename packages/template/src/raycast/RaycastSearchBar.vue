/**
 * List 的搜索栏桥接：在 wujie 宿主内由外层 InputBar 渲染真正的搜索 UI，子应用通过 props 同步状态。
 */
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { RaycastViewWujiePropsSubset } from './wujie-utils';

const props = defineProps<{
  enabled: boolean;
  value: string;
  searchBarPlaceholder?: string;
}>();

const emit = defineEmits<{
  'update:value': [string];
}>();

type HostSearchBridge = {
  events: EventTarget;
  updateSearchBarVisible: (visible: boolean) => void;
  updateSearchBarValue: (value: string) => void;
};

function readHostSearchBridge(): HostSearchBridge | null {
  const p = (window as Window & { $wujie?: { props?: RaycastViewWujiePropsSubset } }).$wujie
    ?.props;
  if (!p) return null;
  const events = p.events;
  if (
    !events ||
    typeof p.updateSearchBarVisible !== 'function' ||
    typeof p.updateSearchBarValue !== 'function'
  ) {
    return null;
  }
  return {
    events,
    updateSearchBarVisible: p.updateSearchBarVisible,
    updateSearchBarValue: p.updateSearchBarValue,
  };
}

/** 每次访问读取最新 `$wujie.props`（与 React 版 `bridgeRef.current = getHostSearchBridge()` 一致） */
const hostBridge = computed(() => readHostSearchBridge());

const hasHostBridge = computed(() => hostBridge.value !== null);

watch(
  () => props.enabled,
  (enabled) => {
    hostBridge.value?.updateSearchBarVisible(enabled);
  },
  { immediate: true },
);

watch(
  () => [props.enabled, props.value, hostBridge.value] as const,
  ([enabled, value, b]) => {
    if (!enabled || !b) return;
    b.updateSearchBarValue(value);
  },
);

const valueMirror = ref(props.value);
watch(
  () => props.value,
  (v) => {
    valueMirror.value = v;
  },
);

let searchHandler: EventListener | null = null;
let attachedBridge: HostSearchBridge | null = null;

function detachSearch() {
  if (searchHandler && attachedBridge) {
    attachedBridge.events.removeEventListener('search', searchHandler);
  }
  searchHandler = null;
  attachedBridge = null;
}

watch(
  () => [props.enabled, hostBridge.value] as const,
  ([enabled, b]) => {
    detachSearch();
    if (!enabled || !b) return;
    attachedBridge = b;
    searchHandler = ((event: Event) => {
      const keyword = String(
        (event as CustomEvent<{ keyword?: string }>).detail?.keyword ?? '',
      );
      if (keyword === valueMirror.value) return;
      valueMirror.value = keyword;
      emit('update:value', keyword);
    }) as EventListener;
    b.events.addEventListener('search', searchHandler);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  detachSearch();
  readHostSearchBridge()?.updateSearchBarVisible(false);
});

function onInput(ev: Event) {
  const text = (ev.target as HTMLInputElement).value;
  valueMirror.value = text;
  emit('update:value', text);
}
</script>

<template>
  <template v-if="props.enabled">
    <div v-if="!hasHostBridge" class="rv-raycast-list-search-row">
      <input
        type="search"
        class="rv-raycast-list-search-input"
        :placeholder="searchBarPlaceholder"
        :value="value"
        :aria-label="searchBarPlaceholder ?? 'Search'"
        @input="onInput"
      />
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
