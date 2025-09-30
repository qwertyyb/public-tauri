<template>
  <div
    ref="wujie"
    class="plugin-wujie-view"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';

const props = defineProps<{
  wujie: {
    // eslint-disable-next-line no-unused-vars
    mount:(el: HTMLElement) => any,
    unmount: () => any
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
  margin-top: var(--nav-height);
  height: calc(100vh - var(--nav-height));
}
</style>
