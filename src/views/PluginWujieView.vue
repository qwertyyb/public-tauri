<template>
  <div class="plugin-wujie-view">
    <InputBar v-model="keyword" />
    <div
      ref="wujie"
      class="wujie-container"
    />
  </div>
</template>

<script setup lang="ts">
import InputBar from '@/components/InputBar.vue';
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

const props = defineProps<{
  wujie: {
    // eslint-disable-next-line no-unused-vars
    mount:(el: HTMLElement) => any,
    initialKeyword: string,
    unmount: () => any,
    // eslint-disable-next-line no-unused-vars
    onInput: (value: string) => void,
  }
}>();

const container = useTemplateRef('wujie');

const keyword = ref(props.wujie.initialKeyword ?? '');

watch(keyword, (value) => {
  props.wujie.onInput(value);
});

onMounted(() => {
  props.wujie.mount(container.value!);
});

onBeforeUnmount(() => {
  props.wujie.unmount();
});
</script>

<style lang="scss" scoped>
.plugin-wujie-view {
  --nav-width: 36px;
}
.wujie-container {
  height: calc(100vh - var(--nav-height));
}
</style>
