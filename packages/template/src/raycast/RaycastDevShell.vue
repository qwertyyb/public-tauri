<script setup lang="ts">
/**
 * 独立调试：`pnpm dev` 打开 `/raycast.html` 时无 wujie / Worker，使用本地 mock snapshot。
 */
import { computed, shallowRef } from 'vue';
import { hydrateRaycastViewSnapshot } from './hydrate-snapshot-funcs';
import type { RaycastViewSnapshot } from './types';
import RaycastViewBody from './RaycastViewBody.vue';

const MOCK_SNAPSHOT: RaycastViewSnapshot = {
  commandName: 'dev-demo',
  searchText: '',
  selectedItemId: 'b',
  root: {
    hostId: 'rv:n:root',
    type: 'raycast:list',
    props: {
      navigationTitle: 'Demo command',
      searchBarPlaceholder: 'Search demo items…',
    },
    children: [
      {
        hostId: 'rv:n:a',
        type: 'raycast:list-item',
        props: {
          id: 'a',
          title: 'First item',
          subtitle: 'Subtitle with secondary tone',
          icon: '📎',
          detail: {
            hostId: 'rv:p:1',
            type: 'raycast:detail',
            props: { markdown: '# Detail\n\nMarkdown **body** for item A.\n\n- One\n- Two\n' },
            children: [],
          },
          actions: {
            hostId: 'rv:p:2',
            type: 'raycast:action-panel',
            props: {},
            children: [
              {
                hostId: 'rv:p:3',
                type: 'raycast:action',
                props: {
                  title: 'Open',
                  shortcut: { modifiers: ['cmd'], key: 'o' },
                  onAction: '__func__onAction',
                },
                children: [],
              },
            ],
          },
        },
        children: [],
      },
      {
        hostId: 'rv:n:b',
        type: 'raycast:list-item',
        props: {
          id: 'b',
          title: 'Second item',
          subtitle: 'Uses letter fallback icon',
          detail: {
            hostId: 'rv:p:4',
            type: 'raycast:detail',
            props: { markdown: 'Plain paragraph with `inline code`.' },
            children: [],
          },
        },
        children: [],
      },
      {
        hostId: 'rv:n:c',
        type: 'raycast:list-item',
        props: {
          id: 'c',
          title: 'Third — empty detail pane',
          subtitle: 'No detail node',
        },
        children: [],
      },
    ],
  },
};

const snap = shallowRef<RaycastViewSnapshot | null>(MOCK_SNAPSHOT);

const displaySnap = computed(() => {
  const raw = snap.value;
  if (!raw) return null;
  return hydrateRaycastViewSnapshot(raw, {
    getCommandName: () => raw.commandName,
    dispatch: () => Promise.resolve(),
  });
});

function onSelectItem(itemId: string) {
  const prev = snap.value;
  if (prev) snap.value = { ...prev, selectedItemId: itemId };
}
</script>

<template>
  <div class="rv-dev-standalone">
    <div class="rv-dev-banner" role="note">
      Raycast view — <strong>standalone dev</strong>
      （无 wujie / Worker；点击列表仅更新本地选中态）
    </div>
    <div class="rv-dev-grid">
      <section>
        <div class="rv-dev-section-title">Protocol tree（模拟 Worker snapshot）</div>
        <RaycastViewBody :snapshot="displaySnap" :on-select-item="onSelectItem" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.rv-dev-standalone {
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

  min-height: 100vh;
  background: var(--rv-bg);
  color: var(--rv-text);
  font-family: var(--rv-font);
  -webkit-font-smoothing: antialiased;
}

.rv-dev-standalone :deep(*) {
  box-sizing: border-box;
}

.rv-dev-banner {
  padding: 10px 16px;
  font-size: 12px;
  color: var(--rv-text-secondary);
  background: rgba(10, 132, 255, 0.12);
  border-bottom: 1px solid var(--rv-border);
}

.rv-dev-banner strong {
  color: var(--rv-text);
}

.rv-dev-grid {
  display: grid;
  gap: 24px;
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

.rv-dev-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--rv-text-secondary);
  margin-bottom: 10px;
}
</style>
