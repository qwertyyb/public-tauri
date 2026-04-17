<script setup lang="ts">
import { createPlugin } from '@public-tauri/api'
import CreateSnippetView from '@/views/CreateSnippetView.vue';
import EditSnippetView from '@/views/EditSnippetView.vue';
import SnippetsListView from '@/views/SnippetsListView.vue';
import { provide, ref } from 'vue';

const command = ref('')

const editSnippet = ref<{ index: number; title: string; content: string } | null>(null)

provide('snippetsUi', {
  startEdit: (payload: { index: number; title: string; content: string }) => {
    editSnippet.value = payload
    command.value = 'edit-snippet'
  },
  finishEdit: () => {
    editSnippet.value = null
    command.value = 'search-snippets'
  },
})

createPlugin({
  onEnter(params: any) {
    command.value = params.name
    editSnippet.value = null
  },
  onExit() {
    command.value = ''
    editSnippet.value = null
  }
})

</script>

<template>
  <create-snippet-view v-if="command === 'create-snippet'" />
  <edit-snippet-view
    v-else-if="command === 'edit-snippet' && editSnippet"
    :payload="editSnippet"
  />
  <snippets-list-view v-else-if="command === 'search-snippets'" />
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
