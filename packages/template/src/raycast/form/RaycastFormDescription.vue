<script setup lang="ts">
defineProps<{
  text?: string;
}>();
</script>

<template>
  <p class="rv-form-description">
    {{ text ?? '' }}
  </p>
</template>

<style scoped>
.rv-form-description {
  margin: 0;
  color: var(--rv-text-secondary);
  font-size: 12px;
}
</style>
