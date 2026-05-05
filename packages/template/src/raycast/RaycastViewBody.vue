<script setup lang="ts">
import type { RaycastViewSnapshot, SerializedHostListItemNode } from './types';
import RaycastDetailView from './views/RaycastDetailView.vue';
import RaycastListView from './views/RaycastListView.vue';

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
    <RaycastDetailView
      v-if="snapshot?.root.type === 'raycast:detail'"
      v-bind="snapshot.root.props"
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
  /* --rv-bg: light-dark(#f6f7f9, #1e1e1e); */
  --rv-surface: light-dark(#ffffff, #252526);
  --rv-surface-elevated: light-dark(#f3f4f6, #2d2d30);
  --rv-border: light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.08));
  --rv-text: light-dark(rgba(0, 0, 0, 0.8), rgba(255, 255, 255, 0.8));
  --rv-text-secondary: light-dark(rgba(0, 0, 0, 0.48), rgba(255, 255, 255, 0.48));
  --rv-accent: light-dark(#1f2937, #f7f7f7);
  --rv-row-hover: light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.06));
  --rv-row-selected: light-dark(rgba(10, 132, 255, 0.14), rgba(10, 132, 255, 0.22));
  --rv-row-selected-border: light-dark(rgba(10, 132, 255, 0.42), rgba(10, 132, 255, 0.55));
  /* --rv-detail-bg: light-dark(#fafbfc, #232323); */
  --rv-radius: 10px;
  --rv-shadow: light-dark(0 8px 24px rgba(15, 23, 42, 0.12), 0 12px 40px rgba(0, 0, 0, 0.35));

  height: 100%;
  width: 100%;
  color-scheme: light dark;
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
