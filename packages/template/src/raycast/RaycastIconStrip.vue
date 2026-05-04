<script setup lang="ts">
import AppIcon from '@public-tauri/icon/AppIcon.vue';
import { computed } from 'vue';

const props = defineProps<{
  /** 协议里已是 string；Raycast Icon 枚举串、public-icon、URL、emoji 等 */
  icon?: string;
  title: string;
}>();

const urlLike = (s: string) => /^(https?:|data:|file:|\/|\.\/)/i.test(s.trim());

const letter = computed(() => props.title.trim().slice(0, 1).toUpperCase() || '?');

const appIconValue = computed(() => {
  const i = props.icon?.trim();
  if (!i) return undefined;
  if (i.startsWith('public-icon://')) return i;
  if (urlLike(i)) return i;
  return undefined;
});
</script>

<template>
  <span v-if="!props.icon" class="rv-icon rv-icon-fallback" aria-hidden>{{ letter }}</span>
  <span v-else-if="appIconValue" class="rv-icon rv-icon-app">
    <AppIcon class="rv-app-icon-inner" :icon="appIconValue" :size="22" />
  </span>
  <span v-else class="rv-icon rv-icon-emoji" aria-hidden>{{ props.icon }}</span>
</template>

<style scoped>
.rv-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  background: var(--rv-surface-elevated);
  border: 1px solid var(--rv-border);
  overflow: hidden;
}

.rv-icon-fallback {
  font-size: 11px;
  font-weight: 650;
  color: var(--rv-text-secondary);
}

.rv-icon-app {
  padding: 0;
}

.rv-app-icon-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rv-text-primary);
}

.rv-icon-emoji {
  font-variant-emoji: emoji;
}
</style>
