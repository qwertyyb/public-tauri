<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div class="rv-empty">
    <div class="rv-empty-inner">
      <p class="rv-empty-title">{{ title || 'No Results' }}</p>
      <p v-if="description" class="rv-empty-description">{{ description }}</p>
    </div>
  </div>
</template>

<style scoped>
.rv-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: 24px;
  color: var(--rv-text-secondary);
}

.rv-empty-inner {
  text-align: center;
  max-width: 280px;
}

.rv-empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--rv-text);
}

.rv-empty-description {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.45;
}
</style>
