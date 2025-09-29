<script setup lang="ts">
import { onEnterCommand } from '@public/plugin'
import CreateSnippetView from '@/views/CreateSnippetView.vue';
import { ref } from 'vue';

const command = ref('')

onEnterCommand(name => {
  command.value = name
})

</script>

<template>
  <create-snippet-view v-if="command === 'create-snippet'"></create-snippet-view>
</template>

<style scoped></style>
