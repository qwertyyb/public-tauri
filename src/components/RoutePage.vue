<template>
  <section class="route-page">
    <slot />
  </section>
</template>

<script setup lang="ts">
import { pageEventSymbol } from '@/router';
import { onBeforeUnmount, onMounted, provide } from 'vue';

const pageEvent = new EventTarget();

provide(pageEventSymbol, pageEvent);

const dispatchLeave = () => {
  pageEvent.dispatchEvent(new CustomEvent('pageLeave'));
};
const dispatchEnter = () => {
  console.log('dispatchEnter');
  pageEvent.dispatchEvent(new CustomEvent('pageEnter'));
};

onMounted(dispatchEnter);

onBeforeUnmount(dispatchLeave);

defineExpose({
  dispatchLeave,
  dispatchEnter,
});
</script>
