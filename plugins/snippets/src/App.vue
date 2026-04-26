<script setup lang="ts">
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

const events = window.$wujie?.props?.events as EventTarget | undefined

events?.addEventListener('plugin:action', ((event: Event) => {
  const { command: params } = (event as CustomEvent).detail || {}
  command.value = params.name
  editSnippet.value = null
}) as EventListener)

events?.addEventListener('plugin:exit', (() => {
  command.value = ''
  editSnippet.value = null
}) as EventListener)

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
