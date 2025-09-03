<template>
  <div class="create-snippet-view">
    <h1>Create Snippet</h1>
    <el-form
      label-position="top"
      @submit.prevent="createSnippet"
    >
      <el-form-item label="Title">
        <el-input
          ref="title"
          v-model="formValue.title"
          autofocus
          type="text"
          placeholder="Title"
          @keydown="keyDownHandler($event, 'title')"
        />
      </el-form-item>
      <el-form-item label="Content">
        <el-input
          v-model="formValue.content"
          type="textarea"
          placeholder="Content"
          @keydown="keyDownHandler($event, 'content')"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          @click="createSnippet"
        >
          Create
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, toRaw, useTemplateRef } from 'vue';
import { ElInput, ElForm, ElFormItem, ElButton } from 'element-plus';
import { onPageEnter } from '@/router/hooks';
import { isKeyPressed } from '@/utils/keyboard';

const formValue = ref({
  title: '',
  content: '',
});

const titleInput = useTemplateRef('title');

const createSnippet = async () => {
  await window.PublicApp.mainAPI.db.run('INSERT INTO snippets (title, content) VALUES ($title, $content)', { ...toRaw(formValue.value) });
  window.publicApp.showHUD('创建成功');
  window.PublicApp.mainAPI.mainWindow.popToRoot();
};

const keyDownHandler = (event: KeyboardEvent | Event, name: 'title' | 'content') => {
  if (event instanceof KeyboardEvent && isKeyPressed(event, 'Escape')) {
    if (formValue.value[name]) {
      formValue.value[name] = '';
      return;
    }
    window.PublicApp.mainAPI.mainWindow.popToRoot();
  }
};

onPageEnter(() => {
  titleInput.value?.focus();
});
</script>

<style lang="scss" scoped>
.create-snippet-view {
  padding: var(--nav-height) 16px 16px 16px;
}
</style>
