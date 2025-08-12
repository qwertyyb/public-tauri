<template>
  <section class="route-page">
    <slot></slot>
  </section>
</template>

<script setup lang="ts">
import { router } from '@public/api/core';
import { onBeforeUnmount, onMounted, provide } from 'vue';

const pageEvent = new EventTarget()

provide(router.pageEventSymbol, pageEvent)

const dispatchLeave = () => {
  pageEvent.dispatchEvent(new CustomEvent('pageLeave'))
}
const dispatchEnter = () => {
  console.log('dispatchEnter')
  pageEvent.dispatchEvent(new CustomEvent('pageEnter'))
}

onMounted(dispatchEnter)

onBeforeUnmount(dispatchLeave)

defineExpose({
  dispatchLeave,
  dispatchEnter
})
</script>