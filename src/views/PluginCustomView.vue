<template>
  <component :is="Component"></component>
</template>

<script setup lang="ts">
import { type Component } from 'vue';

defineProps<{
  Component: Component
}>()

</script>