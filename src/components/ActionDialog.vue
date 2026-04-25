<template>
  <dialog
    ref="dialog"
    class="confirm-dialog"
  >
    <div class="dialog-body">
      <h1
        v-if="options.title"
        class="dialog-title"
      >
        {{ options.title }}
      </h1>
      <div class="dialog-message">
        {{ options.message }}
      </div>
    </div>
    <div class="dialog-actions">
      <div
        v-if="options.showCancel"
        class="dialog-action-btn cancel-btn"
        @click="onCancel"
      >
        {{ options.cancelText || '取消' }}
      </div>
      <div
        class="dialog-action-btn confirm-btn"
        @click="onConfirm"
      >
        {{ options.confirmText || '确认' }}
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import type { IDialogOptions } from '@/types';
import { onMounted, onUnmounted, useTemplateRef } from 'vue';

const props = defineProps<{
  options: IDialogOptions
}>();

const dialog = useTemplateRef('dialog');

const onConfirm = () => {
  dialog.value?.close();
  props.options.onConfirm?.();
};

const onCancel = () => {
  dialog.value?.close();
  props.options.onCancel?.();
};

onMounted(() => {
  dialog.value?.showModal();
});

onUnmounted(() => {
  dialog.value?.close();
});
</script>

<style lang="scss" scoped>
dialog {
  width: 300px;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border: none;
  outline: none;
  border-radius: var(--ui-radius, 0.375rem);
  background-color: var(--ui-bg-elevated, #f4f4f4);
  padding: 0;
  overflow: hidden;
  &::backdrop {
    background-color: rgba(0, 0, 0, 0.8);
  }

  .dialog-body {
    padding: 20px;
    text-align: center;
  }
  .dialog-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .dialog-message {
    font-size: 14px;
    opacity: 0.8;
    white-space: pre-line;
  }
  .dialog-actions {
    display: flex;
    border-top: 1px solid var(--divider-color);
  }
  .dialog-action-btn {
    flex: 1;
    padding: 8px 16px;
    transition: background .2s;
    text-align: center;
    &:hover {
      cursor: pointer;
      background: rgba(0, 0, 0, 0.1);
    }
    &.cancel-btn {
      opacity: 0.7;
    }
    &.confirm-btn {
      color: var(--theme-color);
    }
    & + .dialog-action-btn {
      border-left: 1px solid var(--divider-color);
    }
  }
}
</style>

<style>
.dark dialog.confirm-dialog {
  background-color: #27272a;
}
</style>
