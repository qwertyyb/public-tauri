<template>
  <div class="create-script-command">
    <h1 class="title">Create Script Command</h1>
    <form class="create-form">
      <div class="form-item">
        <label class="form-item-label">Template</label>
        <select class="form-item-input">
          <option value="">Node.JS</option>
          <option value="">Bash</option>
        </select>
      </div>
      <div class="form-item">
        <label class="form-item-label">Name</label>
        <input class="form-item-input" type="text" placeholder="Name" />
      </div>
      <div class="form-item">
        <label class="form-item-label">Description</label>
        <textarea class="form-item-input" placeholder="Description"></textarea>
      </div>
      <div class="form-item">
        <button type="submit" class="submit-btn" @click.prevent="submitHandler">Create</button>
      </div>
    </form>
  </div>
</template>
<script setup lang="ts">
import { showSaveFilePicker } from '@public/api'

const submitHandler = () => {
  console.log('submitHandler');
  showSaveFilePicker({
    canCreateDirectories: true,
    defaultPath: '$HOME/scripts',
    filters: [
      {
        extensions: ['js'],
        name: 'test',
      }
    ]
  })
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
  color: #1f2937;
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
  color: #374151;
}

.form-item-input {
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: #ffffff;
  transition: all 0.2s ease;
}

.form-item-input:hover {
  border-color: #9ca3af;
}

.form-item-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-item-input::placeholder {
  color: #9ca3af;
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
