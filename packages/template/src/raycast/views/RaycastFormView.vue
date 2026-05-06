<script setup lang="ts">
import { type PluginShellAction, updateActions } from '@public-tauri/api';
import { computed, onBeforeUnmount, watch } from 'vue';
import RaycastFormNode from '../RaycastFormNode.vue';
import { actionDisplayTitle, collectRaycastActions, iconPropToDisplay } from '../host-tree';
import type { SerializedHostActionNode, SerializedHostNode } from '../types';

const props = withDefaults(defineProps<{
  node: SerializedHostNode;
  actions?: SerializedHostNode;
  isLoading?: boolean;
}>(), {
  actions: undefined,
  isLoading: false,
});

function safeUpdateActions(actions: PluginShellAction[]) {
  if (typeof window === 'undefined' || !window.$wujie) return;
  updateActions(actions);
}

const formActions = computed(() => {
  const rootActions = props.actions ? collectRaycastActions(props.actions) : [];
  const treeActions = collectRaycastActions(props.node);
  const dedup = new Map<string, SerializedHostActionNode>();
  for (const node of [...rootActions, ...treeActions]) {
    if (node.type === 'raycast:action') dedup.set(node.hostId, node as SerializedHostActionNode);
  }
  return [...dedup.values()];
});

watch(
  formActions,
  () => {
    safeUpdateActions(formActions.value.map(action => ({
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
  <section class="rv-form-shell">
    <div
      v-if="isLoading"
      class="rv-form-loading-bar"
      aria-busy="true"
    />
    <div class="rv-form-body">
      <RaycastFormNode
        v-for="child in node.children"
        :key="child.hostId"
        :node="child"
      />
    </div>
  </section>
</template>

<style scoped>
.rv-form-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* background: var(--rv-surface); */
}

.rv-form-loading-bar {
  flex-shrink: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--rv-accent, #6ae3ff),
    transparent
  );
  background-size: 200% 100%;
  animation: rv-form-loading-shimmer 1.2s ease-in-out infinite;
}

@keyframes rv-form-loading-shimmer {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}

.rv-form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  overflow: auto;
}
</style>
