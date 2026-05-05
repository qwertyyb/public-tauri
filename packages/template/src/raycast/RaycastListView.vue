<script setup lang="ts">
import { type PluginShellAction, updateActions } from '@public-tauri/api';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { SerializedHostListItemNode } from './types';
import {
  actionDisplayTitle,
  detailPaneFromSlot,
  iconPropToDisplay,
  itemActionsForBar,
  itemBusinessId,
  itemDetailSlot,
} from './host-tree';
import type { RaycastListViewProps } from './protocol/fromSerializedList';
import { coerceSelectedIdForItemIds } from './view-selection';
import RaycastDetailMarkdown from './RaycastDetailMarkdown.vue';
import RaycastDetailMetadata from './RaycastDetailMetadata.vue';
import RaycastEmptyPanel from './RaycastEmptyPanel.vue';
import RaycastIconStrip from './RaycastIconStrip.vue';
import RaycastSearchBar from './RaycastSearchBar.vue';
import RaycastShortcutBadge from './RaycastShortcutBadge.vue';

const props = defineProps<RaycastListViewProps>();

const listRef = ref<HTMLElement | null>(null);
const searchThrottleTimer = ref<ReturnType<typeof setTimeout> | null>(null);

function safeUpdateActions(actions: PluginShellAction[]) {
  if (typeof window === 'undefined' || !window.$wujie) return;
  updateActions(actions);
}

const filterOn = computed(() => Boolean(props.filtering));

const needle = computed(() => (props.searchText ?? '').trim().toLowerCase());

const displayItems = computed(() => {
  if (!filterOn.value || !needle.value) return props.items;
  return props.items.filter((item) => {
    const title = String(item.props.title ?? '').toLowerCase();
    const sub = item.props.subtitle !== null && item.props.subtitle !== undefined
      ? String(item.props.subtitle).toLowerCase()
      : '';
    const keywords = item.props.keywords as string[] | undefined;
    const kwHit = keywords?.some(k => String(k).toLowerCase()
      .includes(needle.value)) ?? false;
    return title.includes(needle.value) || sub.includes(needle.value) || kwHit;
  });
});

/** 与 Raycast 宿主一致：由列表维护首选 id；`props.selectedItemId` 为 Worker 默认 */
const localPreferredId = ref<string | undefined>(undefined);

const visibleItemIds = computed(() => displayItems.value.map(it => itemBusinessId(it)));

const selectedId = computed(() => coerceSelectedIdForItemIds(
  visibleItemIds.value,
  localPreferredId.value,
  props.selectedItemId,
) ?? '');

watch(
  () => ({
    sessionKey: props.selectionSessionKey ?? '',
    workerDefault: props.selectedItemId,
    visibleSig: visibleItemIds.value.join('\0'),
  }),
  (next, prev) => {
    const ids = visibleItemIds.value;
    if (ids.length === 0) {
      localPreferredId.value = undefined;
      return;
    }
    const sessionChanged = !prev || prev.sessionKey !== next.sessionKey;
    if (sessionChanged) {
      localPreferredId.value = coerceSelectedIdForItemIds(ids, undefined, next.workerDefault);
    } else {
      localPreferredId.value = coerceSelectedIdForItemIds(ids, localPreferredId.value, next.workerDefault);
    }
  },
  { immediate: true },
);

function syncHostActionBar() {
  const item = props.items.find(it => itemBusinessId(it) === selectedId.value);
  const selectedActions = item ? itemActionsForBar(item) : [];
  safeUpdateActions(selectedActions.map(action => ({
    name: action.hostId,
    title: actionDisplayTitle(action),
    icon: iconPropToDisplay(action.props.icon),
    shortcut: action.props.shortcut as { modifiers?: string[]; key?: string } | undefined,
    action: () => {
      const run = action.props.onAction;
      if (typeof run === 'function') {
        void (run as () => void)();
      }
    },
  })));
}

watch(
  () => [selectedId.value, props.items, props.selectionSessionKey] as const,
  () => {
    syncHostActionBar();
  },
  { immediate: true },
);

const selectedDetail = computed(() => {
  const id = selectedId.value;
  const item = displayItems.value.find(it => itemBusinessId(it) === id);
  if (!item) return undefined;
  const slot = itemDetailSlot(item);
  return detailPaneFromSlot(slot);
});
const detailColumnVisible = computed(() => props.isShowingDetail || Boolean(selectedDetail.value));

const emptyShown = computed(() => displayItems.value.length === 0 && props.emptyView !== undefined);

const listPagination = computed(() => {
  const onLoadMore = props.pagination?.onLoadMore;
  if (typeof onLoadMore !== 'function' || !props.pagination) return undefined;
  return {
    hasMore: props.pagination.hasMore,
    pageSize: props.pagination.pageSize,
    onLoadMore,
  };
});

function shortcutAccessory(item: SerializedHostListItemNode) {
  const actions = itemActionsForBar(item);
  const shortcut = actions[0]?.props.shortcut as { modifiers?: string[]; key?: string } | undefined;
  return shortcut?.key ? shortcut : undefined;
}

function selectItem(id: string) {
  localPreferredId.value = id;
  props.onSelectionChange?.(id);
}

function emitSearch(text: string) {
  if (!props.onSearchTextChange) return;
  if (searchThrottleTimer.value) clearTimeout(searchThrottleTimer.value);
  if (props.throttle) {
    searchThrottleTimer.value = setTimeout(() => {
      props.onSearchTextChange?.(text);
    }, 280);
  } else {
    props.onSearchTextChange(text);
  }
}

function onSearchBarUpdate(value: string) {
  emitSearch(value);
}

function onKeyDown(e: KeyboardEvent) {
  const ids = displayItems.value.map(it => itemBusinessId(it));
  if (ids.length === 0) return;
  const cur = Math.max(0, ids.indexOf(selectedId.value));
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = ids[Math.min(cur + 1, ids.length - 1)];
    if (next !== undefined) selectItem(next);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const next = ids[Math.max(cur - 1, 0)];
    if (next !== undefined) selectItem(next);
  }
}

watch(
  [selectedId, () => displayItems.value.length],
  () => {
    void nextTick(() => {
      listRef.value?.querySelector<HTMLElement>('.rv-list-item-selected')?.scrollIntoView({
        block: 'nearest',
      });
    });
  },
);

const onSearch = (event: CustomEvent<{ value: string }>) => {
  emitSearch(event.detail.value);
};

onMounted(() => {
  window.addEventListener('keyup', onKeyDown);
  window.$wujie?.props?.events.addEventListener('search', onSearch as (_event: Event) => void);
});

onBeforeUnmount(() => {
  if (searchThrottleTimer.value) clearTimeout(searchThrottleTimer.value);
  safeUpdateActions([]);
  window.removeEventListener('keyup', onKeyDown);

  window.$wujie?.props?.events.removeEventListener('search', onSearch as (_event: Event) => void);
});

</script>

<template>
  <div
    class="rv-list-shell"
    :class="{ 'rv-list-no-detail': !detailColumnVisible }"
    data-raycast-list
    :data-raycast-throttle="props.throttle ? 'true' : undefined"
  >
    <RaycastSearchBar
      :enabled="filterOn"
      :value="searchText ?? ''"
      :search-bar-placeholder="searchBarPlaceholder"
      @update:value="onSearchBarUpdate"
    />

    <div
      v-if="isLoading"
      class="rv-list-loading-bar"
      aria-busy="true"
    />

    <div class="rv-list-split">
      <div
        ref="listRef"
        class="rv-list-column"
        role="listbox"
        aria-label="Results"
        tabindex="0"
        @keydown="onKeyDown"
      >
        <div class="rv-list-scroll">
          <div
            v-if="emptyShown && emptyView"
            class="rv-raycast-list-empty-view"
          >
            <RaycastEmptyPanel
              :title="(emptyView.props.title as string | undefined)"
              :description="(emptyView.props.description as string | undefined)"
            />
          </div>
          <template v-else>
            <div
              v-for="item in displayItems"
              :key="itemBusinessId(item)"
              type="button"
              class="rv-list-item"
              :class="{ 'rv-list-item-selected': itemBusinessId(item) === selectedId }"
              :data-item-id="itemBusinessId(item)"
              :aria-current="itemBusinessId(item) === selectedId ? 'true' : undefined"
              @click="selectItem(itemBusinessId(item))"
            >
              <RaycastIconStrip
                :icon="iconPropToDisplay(item.props.icon)"
                :title="String(item.props.title ?? '')"
              />
              <span class="rv-list-item-text">
                <span class="rv-list-item-title">{{ item.props.title ?? '' }}</span>
                <span
                  v-if="item.props.subtitle != null"
                  class="rv-list-item-subtitle"
                >{{ item.props.subtitle }}</span>
              </span>
              <span
                v-if="shortcutAccessory(item as SerializedHostListItemNode)"
                class="rv-list-item-accessories"
              >
                <RaycastShortcutBadge :shortcut="shortcutAccessory(item as SerializedHostListItemNode)" />
              </span>
            </div>
          </template>
        </div>
        <div
          v-if="listPagination?.hasMore && listPagination.onLoadMore"
          class="rv-list-pagination"
        >
          <button
            type="button"
            class="rv-list-load-more"
            @click="listPagination.onLoadMore?.()"
          >
            Load more
          </button>
        </div>
      </div>
      <aside
        v-if="detailColumnVisible"
        class="rv-detail-column"
        aria-label="Detail"
      >
        <div
          v-if="selectedDetail?.kind === 'detail'"
          class="rv-raycast-item-detail"
        >
          <RaycastDetailMarkdown
            :markdown="selectedDetail.markdown"
          />
          <RaycastDetailMetadata
            v-if="selectedDetail.metadata"
            :node="selectedDetail.metadata"
          />
        </div>
        <div
          v-else-if="selectedDetail?.kind === 'empty'"
          class="rv-raycast-item-detail"
        >
          <RaycastEmptyPanel
            :title="selectedDetail.title"
            :description="selectedDetail.description"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.rv-list-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.rv-list-meta {
  flex-shrink: 0;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--rv-border);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: 11px;
  color: var(--rv-text-secondary);
}

.rv-list-navigation-title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--rv-text);
  font-style: normal;
}

.rv-list-loading-bar {
  flex-shrink: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--rv-accent, #6ae3ff),
    transparent
  );
  background-size: 200% 100%;
  animation: rv-list-loading-shimmer 1.2s ease-in-out infinite;
}

@keyframes rv-list-loading-shimmer {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}

.rv-list-split {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(240px, 38%) 1fr;
  min-height: 0;
}

.rv-list-shell.rv-list-no-detail .rv-list-split {
  grid-template-columns: 1fr;
}

.rv-list-shell.rv-list-no-detail .rv-detail-column {
  display: none;
}

@media (max-width: 720px) {
  .rv-list-split {
    grid-template-columns: 1fr;
  }

  .rv-detail-column {
    display: none;
  }
}

.rv-list-column {
  display: flex;
  flex-direction: column;
  outline: none;
  border-right: 1px solid var(--rv-border);
  background: var(--rv-surface);
  min-height: 0;
}

.rv-list-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  max-height: calc(100vh - 52px);
}

.rv-list-pagination {
  flex-shrink: 0;
  padding: 8px 12px;
  border-top: 1px solid var(--rv-border);
}

.rv-list-load-more {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--rv-border);
  border-radius: 6px;
  background: var(--rv-surface-elevated, var(--rv-surface));
  color: var(--rv-text);
  font: inherit;
  font-size: 12px;
  cursor: default;
}

.rv-list-load-more:hover {
  background: var(--rv-row-hover);
}

.rv-list-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 8px 10px;
  border: 0;
  border-left: 3px solid transparent;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: default;
  font: inherit;
  min-height: 44px;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}

.rv-list-item:hover {
  background: var(--rv-row-hover);
}

.rv-list-item-selected {
  background: var(--rv-row-selected);
  border-left-color: var(--rv-row-selected-border);
}

.rv-list-item:focus-visible {
  outline: 2px solid rgba(10, 132, 255, 0.65);
  outline-offset: -2px;
}

.rv-list-item-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rv-list-item-title {
  font-weight: 520;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rv-list-item-subtitle {
  font-size: 11px;
  color: var(--rv-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rv-list-item-chevron {
  width: 6px;
  height: 6px;
  border-right: 1.5px solid var(--rv-text-secondary);
  border-bottom: 1.5px solid var(--rv-text-secondary);
  transform: rotate(-45deg);
  opacity: 0.4;
  margin-left: 4px;
  flex-shrink: 0;
}

.rv-raycast-list-meta-extended {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.rv-raycast-list-actions {
  font-size: 12px;
}

.rv-list-item-accessories {
  flex-shrink: 0;
  margin-left: 8px;
}

.rv-raycast-list-empty-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: 12px;
}

.rv-detail-column {
  background: var(--rv-detail-bg);
  min-height: 0;
  overflow: auto;
  box-shadow: inset 1px 0 0 var(--rv-border);
}

.rv-raycast-item-detail {
  padding: 16px 0 0 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
</style>
