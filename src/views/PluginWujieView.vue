<template>
  <div
    ref="wujie"
    class="plugin-wujie-view"
  />
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { startApp } from 'wujie';

const props = defineProps<{ name: string }>();

const container = useTemplateRef('wujie');

onMounted(() => {
  // @ts-ignore
  startApp({ name: props.name, el: container.value!, url: 'http://localhost:5173' });
});
</script>

<style lang="scss" scoped>
.plugin-wujie-view {
  height: 100vh;
}
</style>
