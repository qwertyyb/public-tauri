<script setup lang="ts">
import type { RaycastViewSnapshot, SerializedHostListItemNode } from './types';
import RaycastListView from './RaycastListView.vue';

withDefaults(
  defineProps<{
    snapshot: RaycastViewSnapshot | null;
    /** Worker / 宿主报错文案 */
    error?: string | null;
  }>(),
  { error: null, onSelectItem: undefined, renderMarkdown: undefined },
);
</script>

<template>
  <div class="rv-root">
    <div
      v-if="error"
      class="rv-error-banner"
      role="alert"
    >
      {{ error }}
    </div>
    <div
      v-if="snapshot?.error"
      class="rv-error-banner"
      role="alert"
    >
      {{ snapshot.error }}
    </div>
    <RaycastListView
      v-if="snapshot?.root.type === 'raycast:list'"
      v-bind="snapshot.root.props"
      :items="snapshot.root.children as SerializedHostListItemNode[]"
    />
  </div>
</template>

<style scoped>
:global(body) {
  margin: 0;
  padding: 0;
}

.rv-root {
  --rv-font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  --rv-font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
  --rv-bg: #1e1e1e;
  --rv-surface: #252526;
  --rv-surface-elevated: #2d2d30;
  --rv-border: rgba(255, 255, 255, 0.08);
  --rv-text: rgba(255, 255, 255, 0.92);
  --rv-text-secondary: rgba(255, 255, 255, 0.48);
  --rv-accent: #f7f7f7;
  --rv-row-hover: rgba(255, 255, 255, 0.06);
  --rv-row-selected: rgba(10, 132, 255, 0.22);
  --rv-row-selected-border: rgba(10, 132, 255, 0.55);
  --rv-detail-bg: #232323;
  --rv-radius: 10px;
  --rv-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);

  height: 100%;
  width: 100%;
  font-family: var(--rv-font);
  font-size: 13px;
  line-height: 1.35;
  color: var(--rv-text);
  -webkit-font-smoothing: antialiased;
}

.rv-root :deep(*) {
  box-sizing: border-box;
}

.rv-error-banner {
  padding: 10px 14px;
  background: rgba(255, 69, 58, 0.18);
  border-bottom: 1px solid rgba(255, 69, 58, 0.35);
  color: #ffb4b0;
}
</style>
