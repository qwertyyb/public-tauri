<template>
  <div class="plugin-wujie-view">
    <div
      ref="wujie"
      class="wujie-container"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';

const props = defineProps<{
  wujie: {
    // eslint-disable-next-line no-unused-vars
    mount:(el: HTMLElement) => any,
    unmount: () => any,
  }
}>();

const container = useTemplateRef('wujie');

onMounted(() => {
  props.wujie.mount(container.value!);
});

onBeforeUnmount(() => {
  props.wujie.unmount();
});
</script>

<style lang="scss" scoped>
.plugin-wujie-view {
  height: 100vh;
}
.wujie-container {
  height: 100%;
}
</style>
