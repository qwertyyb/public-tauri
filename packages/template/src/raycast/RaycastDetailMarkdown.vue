<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from './markdown';

const props = defineProps<{
  markdown: string;
}>();

const html = computed(() => renderMarkdown(props.markdown));
</script>

<template>
  <article
    class="raycast-detail-md"
    v-html="html"
  />
</template>

<style scoped>
.raycast-detail-md {
  max-width: 720px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--rv-text);
}

.raycast-detail-md :deep(h1),
.raycast-detail-md :deep(h2),
.raycast-detail-md :deep(h3) {
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 1.1em 0 0.45em;
}

.raycast-detail-md :deep(h1) {
  font-size: 1.35rem;
}

.raycast-detail-md :deep(h2) {
  font-size: 1.12rem;
}

.raycast-detail-md :deep(p) {
  margin: 0.55em 0;
}

.raycast-detail-md :deep(a) {
  color: #6eb5ff;
  text-decoration: none;
}

.raycast-detail-md :deep(a):hover {
  text-decoration: underline;
}

.raycast-detail-md :deep(code) {
  font-family: var(--rv-font-mono);
  font-size: 0.92em;
  padding: 0.12em 0.35em;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
}

.raycast-detail-md :deep(pre) {
  margin: 0.75em 0;
  padding: 12px 14px;
  border-radius: var(--rv-radius);
  background: #141414;
  border: 1px solid var(--rv-border);
  overflow: auto;
  box-shadow: var(--rv-shadow);
}

.raycast-detail-md :deep(pre code) {
  padding: 0;
  background: none;
}

.raycast-detail-md :deep(ul),
.raycast-detail-md :deep(ol) {
  margin: 0.45em 0;
  padding-left: 1.35em;
}

.raycast-detail-md :deep(blockquote) {
  margin: 0.65em 0;
  padding-left: 12px;
  border-left: 3px solid rgba(255, 255, 255, 0.15);
  color: var(--rv-text-secondary);
}
</style>
