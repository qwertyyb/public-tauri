<template>
  <component :is="Component" />
</template>

<script setup lang="ts">
import { type Component } from 'vue';

defineProps<{
  Component: Component
}>();

</script>
