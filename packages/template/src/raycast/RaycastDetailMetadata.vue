<script setup lang="ts">
import { opener } from '@public-tauri/api';
import type { SerializedHostNode } from './types';
import { iconPropToDisplay } from './host-tree';

const props = withDefaults(defineProps<{
  node: SerializedHostNode;
  layout?: 'vertical' | 'horizontal';
}>(), {
  layout: 'horizontal',
});

console.log('props', props.node);

function textFromProp(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && raw !== null && 'value' in raw) {
    return String((raw as { value: unknown }).value);
  }
  return '';
}

function runTagAction(fn: unknown) {
  if (typeof fn === 'function') {
    void (fn as () => void)();
  }
}

function openUrl(url: string) {
  if (!url) return;
  opener.openUrl(url);
}
</script>

<template>
  <ul
    class="rv-detail-metadata-list"
    :class="`layout-${props.layout}`"
  >
    <li
      v-for="ch in props.node.children"
      :key="ch.hostId"
      class="rv-detail-metadata-item"
    >
      <div
        v-if="ch.type.endsWith('-separator')"
        class="rv-detail-metadata-sep"
      />
      <div
        v-else
        class="rv-detail-metadata-item-with-title"
      >
        <span class="rv-detail-metadata-label-title">{{ ch.props.title }}</span>
        <span
          v-if="ch.type.endsWith('-label')"
          class="rv-detail-metadata-label-value"
        >
          <span
            v-if="iconPropToDisplay(ch.props.icon)"
            class="rv-detail-metadata-label-icon"
            aria-hidden
          >{{ iconPropToDisplay(ch.props.icon) }}</span>
          {{ textFromProp(ch.props.text) }}
        </span>

        <a
          v-else-if="ch.type.endsWith('-link')"
          class="rv-detail-metadata-link"
          href="javascript:void(0)"
          rel="noopener noreferrer"
          target="_blank"
          :title="String(ch.props.title ?? '')"
          @click="openUrl(ch.props.target as string)"
        >{{ ch.props.text }}</a>


        <ul
          v-else-if="ch.type.endsWith('-tag-list')"
          class="rv-detail-metadata-tag-list"
        >
          <li
            v-for="tag in ch.children"
            :key="tag.hostId"
            class="rv-detail-metadata-tag-item"
            @click="runTagAction(tag.props.onAction)"
          >
            <span
              v-if="iconPropToDisplay(tag.props.icon)"
              class="rv-detail-metadata-tag-icon"
              aria-hidden
            >{{ iconPropToDisplay(tag.props.icon) }}</span>
            <span class="rv-detail-metadata-tag-item-text">{{ tag.props.text }}</span>
          </li>
        </ul>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.rv-detail-metadata-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  font-size: 12px;
  list-style: none;
  &.layout-horizontal {
    border-top: 1px solid var(--rv-border);
  }
  &.layout-vertical {
    gap: 12px;
    .rv-detail-metadata-item-with-title {
      flex-direction: column;
      align-items: flex-start;
    }
    .rv-detail-metadata-label-title {
      margin-bottom: 8px;
    }
  }
}

.rv-detail-metadata-item {
  width: 100%;
  gap: 8px;
}

.rv-detail-metadata-sep {
  border: 0;
  border-top: 1px solid var(--rv-border);
  margin: 0;
  opacity: 0.65;
  width: 100%;
}

.rv-detail-metadata-label {
  display: grid;
  grid-template-columns: minmax(72px, 32%) 1fr;
  gap: 8px 12px;
  align-items: baseline;
  padding: 5px 0;
}

.rv-detail-metadata-item-with-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.rv-detail-metadata-label-title {
  color: var(--rv-text-secondary);
  font-size: 11px;
  font-weight: 500;
}

.rv-detail-metadata-label-value {
  color: var(--rv-text);
  font-size: 12px;
  word-break: break-word;
}

.rv-detail-metadata-label-icon {
  margin-right: 6px;
  opacity: 0.9;
}

.rv-detail-metadata-link {
  display: inline-block;
  color: #6eb5ff;
  font-size: 12px;
  text-decoration: none;
}

.rv-detail-metadata-link:hover {
  text-decoration: underline;
}

.rv-detail-metadata-tag-list {
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  list-style: none;
}

.rv-detail-metadata-tag-list-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--rv-text-secondary);
  margin-bottom: 8px;
}

.rv-detail-metadata-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--rv-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--rv-text);
  font: inherit;
  font-size: 11px;
  cursor: default;
}

button.rv-detail-metadata-tag:hover {
  background: var(--rv-row-hover);
}

.rv-detail-metadata-tag-icon {
  opacity: 0.85;
}
</style>
