<template>
  <div class="create-snippet-view">
    <h1>Create Snippet</h1>
    <el-form @submit.prevent="createSnippet" label-position="top">
      <el-form-item label="Title">
        <el-input @keydown="keyDownHandler($event, 'title')" ref="title" autofocus type="text" v-model="formValue.title" placeholder="Title" autocorrect="off" autocomplete="off" />
      </el-form-item>
      <el-form-item label="Content">
        <el-input @keydown="keyDownHandler($event, 'content')" type="textarea" v-model="formValue.content" placeholder="Content" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="createSnippet">Create</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, toRaw, useTemplateRef } from 'vue'
import { ElInput, ElForm, ElFormItem, ElButton } from 'element-plus'
import { dialog, mainWindow, storage } from '@public/plugin'

const formValue = ref({
  title: '',
  content: ''
})

const titleInput = useTemplateRef('title')

const createSnippet = async () => {
  const list: { title: string, content: string }[] = (await storage.getItem('snippets')) || []
  list.unshift({ ...toRaw(formValue.value) })
  await storage.setItem('snippets', list)
  dialog.showToast('创建成功')
  mainWindow.popToRoot()
}

const keyDownHandler = (event: KeyboardEvent | Event, name: 'title' | 'content') => {
  if (event instanceof KeyboardEvent && event.key === 'Escape') {
    if (formValue.value[name]) {
      formValue.value[name] = ''
      return
    }
    mainWindow.popToRoot()
  }
}

onMounted(() => {
  setTimeout(() => {
    titleInput.value?.focus()
  }, 200)
})
</script>

<style lang="scss" scoped>
.create-snippet-view {
  padding: 16px;
}
</style>