<script setup lang="ts">
import { computed } from 'vue';
import type { RaycastShortcut } from './types';

const props = defineProps<{
  shortcut?: RaycastShortcut;
}>();

const modifierSymbols: Record<string, string> = {
  cmd: '⌘',
  command: '⌘',
  ctrl: '⌃',
  control: '⌃',
  alt: '⌥',
  option: '⌥',
  shift: '⇧',
};

const label = computed(() => {
  const shortcut = props.shortcut;
  if (!shortcut?.key) return '';
  const mods = (shortcut.modifiers || []).map((m) => modifierSymbols[m.toLowerCase()] || m);
  return [...mods, shortcut.key.toUpperCase()].join('');
});
</script>

<template>
  <kbd v-if="label" class="rv-shortcut" :title="label">{{ label }}</kbd>
</template>

<style scoped>
.rv-shortcut {
  font-family: var(--rv-font-mono);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--rv-border);
  color: var(--rv-text-secondary);
  flex-shrink: 0;
}
</style>
