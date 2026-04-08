<template>
  <div class="create-script-command">
    <h1 class="title">Create Script Command</h1>
    <form class="create-form">
      <div class="form-item">
        <label class="form-item-label">Template</label>
        <select class="form-item-input" v-model="formValue.template">
          <option value="Node.JS">Node.JS</option>
          <option value="Bash">Bash</option>
          <option value="Python">Python</option>
          <option value="AppleScript">Apple Script</option>
        </select>
      </div>
      <div class="form-item">
        <label class="form-item-label">Name</label>
        <input class="form-item-input" type="text" placeholder="Name" v-model.trim="formValue.name" />
      </div>
      <div class="form-item">
        <label class="form-item-label">Description</label>
        <textarea class="form-item-input" placeholder="Description" v-model.trim="formValue.description"></textarea>
      </div>
      <div class="form-item">
        <button type="submit" class="submit-btn" @click.prevent="submitHandler">Create</button>
      </div>
    </form>
  </div>
</template>
<script setup lang="ts">
import { showSaveFilePicker, dialog, fs } from '@public/api'
import { ref } from 'vue';

const suffix = {
  'Node.JS': 'js',
  'Bash': 'sh',
  'Python': 'py',
  'AppleScript': 'applescript',
}

interface IScriptCommandOptions {
  name: string;
  title: string;
  description?: string;
  icon?: string;
}

const formValue = ref<{
  template: 'Node.JS' | 'Bash' | 'Python' | 'AppleScript',
  name: string,
  title: string,
  description: string,
}>({
  template: 'Bash',
  name: '',
  title: '',
  description: '',
})

const generateNodeJS = (options: IScriptCommandOptions) => {
  return `#!/usr/bin/env node
// ${options.title || options.name}
// Description: ${options.description || ''}

const args = process.argv.slice(2);
console.log('arguments: ', args);
`
}
const submitHandler = async () => {
  if (!formValue.value.name) {
    dialog.showToast('Name is required')
    return;
  }
  const filePath = await showSaveFilePicker({
    canCreateDirectories: true,
    defaultPath: `${formValue.value.name}.${suffix[formValue.value.template]}`
  })
  if (!filePath) return;
  dialog.showToast(filePath || 'none')
  await fs.writeTextFile(filePath, generateNodeJS(formValue.value))
}

</script>
<style scoped>
.create-script-command {
  padding: 32px;
  max-width: 480px;
  margin: 0 auto;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: light-dark(#1f2937, #f9fafb);
  margin-bottom: 32px;
  text-align: center;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item-label {
  font-size: 14px;
  font-weight: 500;
  color: light-dark(#374151, #d1d5db);
}

.form-item-input {
  padding: 12px 16px;
  border: 1px solid light-dark(#d1d5db, #4b5563);
  border-radius: 8px;
  font-size: 14px;
  color: light-dark(#1f2937, #f9fafb);
  background: light-dark(#ffffff, #1f2937);
  transition: all 0.2s ease;
}

.form-item-input:hover {
  border-color: light-dark(#9ca3af, #6b7280);
}

.form-item-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.form-item-input::placeholder {
  color: light-dark(#9ca3af, #6b7280);
}

textarea.form-item-input {
  min-height: 80px;
  resize: vertical;
}

.submit-btn {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.submit-btn:active {
  transform: translateY(0);
}
</style>
