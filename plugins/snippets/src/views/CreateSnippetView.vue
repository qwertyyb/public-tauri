<template>
  <div class="create-snippet-view">
    <h1>Create Snippet</h1>
    <form
      class="space-y-4"
      @submit.prevent="createSnippet"
    >
      <UFormField
        label="Title"
        name="title"
      >
        <UInput
          ref="title"
          v-model="formValue.title"
          type="text"
          placeholder="Title"
          :autocorrect="false"
          autocomplete="off"
          :autofocus="true"
          :autofocus-delay="200"
          class="w-full"
          @keydown="keyDownHandler($event, 'title')"
        />
      </UFormField>
      <UFormField
        label="Content"
        name="content"
      >
        <UTextarea
          v-model="formValue.content"
          placeholder="Content"
          :rows="6"
          class="w-full"
          @keydown="keyDownHandler($event, 'content')"
        />
      </UFormField>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, toRaw, useTemplateRef } from 'vue'
import { dialog, mainWindow, setActions, storage } from '@public-tauri/api'

const formValue = ref({
  title: '',
  content: ''
})

const titleInput = useTemplateRef<{
  $el?: HTMLElement
  inputRef?: HTMLInputElement
}>('title')

const createSnippet = async () => {
  const list: { title: string, content: string }[] = (await storage.getItem('snippets')) || []
  list.unshift({ ...toRaw(formValue.value) })
  await storage.setItem('snippets', list)
  dialog.showToast('创建成功')
  setActions([])
  mainWindow.popToRoot()
}

const keyDownHandler = (event: KeyboardEvent | Event, name: 'title' | 'content') => {
  if (event instanceof KeyboardEvent && event.key === 'Escape') {
    if (formValue.value[name]) {
      formValue.value[name] = ''
      return
    }
    setActions([])
    mainWindow.popToRoot()
  }
}

onMounted(() => {
  setActions([
    { name: 'save', title: '创建', action: createSnippet },
  ])
  setTimeout(() => {
    const el = titleInput.value?.inputRef
      ?? titleInput.value?.$el?.querySelector?.('input')
    el?.focus()
  }, 200)
})

onUnmounted(() => {
  setActions([])
})
</script>

<style lang="scss" scoped>
.create-snippet-view {
  padding: 16px;
}
</style>
