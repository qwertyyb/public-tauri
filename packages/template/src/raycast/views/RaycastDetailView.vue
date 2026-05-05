<script setup lang="ts">
import { type PluginShellAction, updateActions } from '@public-tauri/api';
import { computed, onBeforeUnmount, watch } from 'vue';
import RaycastDetailMarkdown from '../RaycastDetailMarkdown.vue';
import RaycastDetailMetadata from '../RaycastDetailMetadata.vue';
import {
  actionDisplayTitle,
  collectRaycastActions,
  iconPropToDisplay,
} from '../host-tree';
import type { SerializedHostNode } from '../types';

const props = withDefaults(defineProps<{
  markdown?: string;
  metadata?: SerializedHostNode;
  actions?: SerializedHostNode;
  isLoading?: boolean;
}>(), {
  markdown: '',
  metadata: undefined,
  actions: undefined,
  isLoading: false,
});

function safeUpdateActions(actions: PluginShellAction[]) {
  if (typeof window === 'undefined' || !window.$wujie) return;
  updateActions(actions);
}

const detailActions = computed(() => {
  const nodes = collectRaycastActions(props.actions);
  return nodes.filter((node): node is SerializedHostNode & { type: 'raycast:action' } => node.type === 'raycast:action');
});

watch(
  detailActions,
  () => {
    safeUpdateActions(detailActions.value.map(action => ({
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
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  safeUpdateActions([]);
});
</script>

<template>
  <section class="rv-detail-shell">
    <div
      v-if="isLoading"
      class="rv-detail-loading-bar"
      aria-busy="true"
    />
    <div class="rv-raycast-detail-view">
      <RaycastDetailMarkdown :markdown="markdown ?? ''" />
      <RaycastDetailMetadata
        v-if="metadata"
        :node="metadata"
      />
    </div>
  </section>
</template>

<style scoped>
.rv-detail-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--rv-detail-bg);
}

.rv-detail-loading-bar {
  flex-shrink: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--rv-accent, #6ae3ff),
    transparent
  );
  background-size: 200% 100%;
  animation: rv-detail-loading-shimmer 1.2s ease-in-out infinite;
}

@keyframes rv-detail-loading-shimmer {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}

.rv-raycast-detail-view {
  min-height: 0;
  overflow: auto;
  padding: 16px 0 0;
}
</style>
