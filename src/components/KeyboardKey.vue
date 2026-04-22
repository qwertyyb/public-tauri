<template>
  <div class="keyboard-key">
    {{ keyValue }}
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{ value: string }>();

const keyValue = computed(() => {
  const keyMap: Record<string, string | undefined> = {
    Command: '⌘',
    Meta: '⌘',
    Enter: '↵',
    Option: '⌥',
    Alt: '⌥',
    Shift: '⇧',
    Control: '^',
    Backspace: '←',
  };
  return keyMap[props.value] || props.value;
});

</script>

<style lang="scss" scoped>
.keyboard-key {
  background: var(--ui-bg-accented, #e0e0e0);
  height: 20px;
  min-width: 20px;
  text-align: center;
  line-height: 20px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
