<template>
  <div class="edit-snippet-view">
    <h1>Edit Snippet</h1>
    <el-form @submit.prevent="saveSnippet" label-position="top">
      <el-form-item label="Title">
        <el-input @keydown="keyDownHandler($event, 'title')" ref="title" autofocus type="text" v-model="formValue.title" placeholder="Title" autocorrect="off" autocomplete="off" />
      </el-form-item>
      <el-form-item label="Content">
        <el-input @keydown="keyDownHandler($event, 'content')" type="textarea" v-model="formValue.content" placeholder="Content" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, toRaw, useTemplateRef, watch } from 'vue'
import { ElInput, ElForm, ElFormItem } from 'element-plus'
import { dialog, setActions, storage } from '@public-tauri/api'

const props = defineProps<{
  payload: { index: number; title: string; content: string }
}>()

const snippetsUi = inject<{ finishEdit: () => void }>('snippetsUi')

const formValue = ref({
  title: '',
  content: ''
})

const titleInput = useTemplateRef('title')

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
    titleInput.value?.focus()
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
