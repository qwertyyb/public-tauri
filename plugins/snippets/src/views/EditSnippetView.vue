<template>
  <div class="edit-snippet-view">
    <h1>Edit Snippet</h1>
    <form
      class="space-y-4"
      @submit.prevent="saveSnippet"
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
import { inject, onMounted, onUnmounted, ref, toRaw, useTemplateRef, watch } from 'vue'
import { dialog, updateActions as setActions, storage } from '@public-tauri/api'

const props = defineProps<{
  payload: { index: number; title: string; content: string }
}>()

const snippetsUi = inject<{ finishEdit: () => void }>('snippetsUi')

const formValue = ref({
  title: '',
  content: ''
})

const titleInput = useTemplateRef<{
  $el?: HTMLElement
  inputRef?: HTMLInputElement
}>('title')

watch(() => props.payload, (p) => {
  formValue.value = { title: p.title, content: p.content }
}, { immediate: true })

const saveSnippet = async () => {
  const list: { title: string, content: string }[] = (await storage.getItem('snippets')) || []
  const i = props.payload.index
  if (i < 0 || i >= list.length) {
    dialog.showToast('片段不存在')
    return
  }
  list[i] = { ...toRaw(formValue.value) }
  await storage.setItem('snippets', list)
  dialog.showToast('保存成功')
  setActions([])
  snippetsUi?.finishEdit()
}

const keyDownHandler = (event: KeyboardEvent | Event, name: 'title' | 'content') => {
  if (event instanceof KeyboardEvent && event.key === 'Escape') {
    if (formValue.value[name]) {
      formValue.value[name] = ''
      return
    }
    setActions([])
    snippetsUi?.finishEdit()
  }
}

onMounted(() => {
  setActions([
    { name: 'save', title: '保存', action: saveSnippet },
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
.edit-snippet-view {
  padding: 16px;
}
</style>
