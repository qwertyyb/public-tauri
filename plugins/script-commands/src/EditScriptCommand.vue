<template>
  <div class="edit-script-command-view">
    <h1>Edit Script Command</h1>
    <form
      class="space-y-4"
      @submit.prevent="saveScriptCommand"
    >
      <UFormField
        label="Template"
        name="template"
      >
        <USelect
          v-model="formValue.template"
          :items="templateItems"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Title"
        name="title"
      >
        <UInput
          ref="title"
          v-model.trim="formValue.title"
          type="text"
          placeholder="Name"
          :autocorrect="false"
          autocomplete="off"
          :autofocus="true"
          :autofocus-delay="200"
          class="w-full"
          @keydown="keyDownHandler($event, 'title')"
        />
      </UFormField>
      <UFormField
        label="Icon"
        name="icon"
      >
        <UInput
          v-model.trim="formValue.icon"
          type="text"
          placeholder="Icon URL"
          :autocorrect="false"
          autocomplete="off"
          class="w-full"
          @keydown="keyDownHandler($event, 'icon')"
        />
      </UFormField>
      <UFormField
        label="Path"
        name="path"
      >
        <UInput
          v-model.trim="formValue.path"
          type="text"
          placeholder="Script path"
          :autocorrect="false"
          autocomplete="off"
          class="w-full"
          @keydown="keyDownHandler($event, 'path')"
        />
      </UFormField>
      <UFormField
        label="Description"
        name="description"
      >
        <UTextarea
          v-model.trim="formValue.description"
          placeholder="Description"
          :rows="5"
          class="w-full"
          @keydown="keyDownHandler($event, 'description')"
        />
      </UFormField>
    </form>
  </div>
</template>

<script setup lang="ts">
import { dialog, opener, storage, updateActions as setActions } from '@public-tauri/api'
import { inject, onMounted, onUnmounted, ref, toRaw, useTemplateRef, watch } from 'vue'
import {
  normalizeTemplate,
  SCRIPT_TEMPLATES,
  type ScriptCommandOptions,
} from './scriptCommand'

const props = defineProps<{
  payload: ScriptCommandOptions & { index: number }
}>()

const scriptCommandsUi = inject<{ finishEdit: () => void }>('scriptCommandsUi')
const templateItems = [...SCRIPT_TEMPLATES]

const formValue = ref<ScriptCommandOptions>({
  template: 'Shell',
  title: '',
  icon: '',
  description: '',
  path: '',
})

const titleInput = useTemplateRef<{
  $el?: HTMLElement
  inputRef?: HTMLInputElement
}>('title')

watch(() => props.payload, (p) => {
  formValue.value = {
    template: normalizeTemplate(p.template),
    title: p.title,
    icon: p.icon || '',
    description: p.description || '',
    path: p.path,
  }
}, { immediate: true })

const saveScriptCommand = async () => {
  if (!formValue.value.title) {
    dialog.showToast('Title is required')
    return
  }
  if (!formValue.value.path) {
    dialog.showToast('Path is required')
    return
  }

  const list: ScriptCommandOptions[] = (await storage.getItem('scriptCommands')) || []
  const i = props.payload.index
  if (i < 0 || i >= list.length) {
    dialog.showToast('命令不存在')
    return
  }
  list[i] = { ...toRaw(formValue.value) }
  await storage.setItem('scriptCommands', list)
  dialog.showToast('保存成功')
  setActions([])
  scriptCommandsUi?.finishEdit()
}

const openScript = async () => {
  if (formValue.value.path) {
    opener.openPath(formValue.value.path)
  }
}

const keyDownHandler = (event: KeyboardEvent | Event, name: keyof ScriptCommandOptions) => {
  if (event instanceof KeyboardEvent && event.key === 'Escape') {
    if (name === 'template') return
    if (formValue.value[name]) {
      formValue.value[name] = ''
      return
    }
    setActions([])
    scriptCommandsUi?.finishEdit()
  }
}

onMounted(() => {
  setActions([
    { name: 'save', title: '保存', action: saveScriptCommand },
    { name: 'open', title: '打开脚本', action: openScript },
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

<style scoped>
.edit-script-command-view {
  padding: 16px;
}
</style>
