<script setup lang="ts">
import { createPlugin } from '@public/api'
import CreateSnippetView from '@/views/CreateSnippetView.vue';
import SnippetsListView from '@/views/SnippetsListView.vue';
import { ref } from 'vue';

const command = ref('')

createPlugin({
  onEnter(params: any) {
    command.value = params.name
  },
  onExit() {
    command.value = ''
  }
})

</script>

<template>
  <create-snippet-view v-if="command === 'create-snippet'"></create-snippet-view>
  <snippets-list-view v-else-if="command === 'search-snippets'"></snippets-list-view>
</template>

<style lang="scss">
body {
  margin: 0;
  padding: 0;
}
:root {
  color-scheme: light dark;
}
</style>

