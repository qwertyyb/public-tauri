<template>
  <dialog
    ref="dialog"
    class="confirm-dialog"
  >
    <h1 class="dialog-title">
      {{ options.title }}
    </h1>
    <div class="dialog-icon" />
    <div class="dialog-message">
      {{ options.message }}
    </div>
    <ul class="dialog-action-btns">
      <li
        v-if="options.showCancel"
        class="dialog-action-btn cancel-btn"
        @click="onCancel"
      >
        {{ options.cancelText || '取消' }}
      </li>
      <li
        class="dialog-action-btn confirm-btn"
        @click="onConfirm"
      >
        {{ options.confirmText || '确认' }}
      </li>
    </ul>
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
  border-radius: 6px;
  background-color: light-dark(#f4f4f4, #373737);
  border-color: light-dark(#ececec, #464646);
  &::backdrop {
    background-color: rgba(0, 0, 0, 0.65);
  }
  & > * {
    width: 100%;
    text-align: center;
  }
  .dialog-title, .dialog-message {
    padding: 20px;
  }
  .dialog-title {
    font-size: 16px;
  }
  .dialog-message {
    padding-top: 0;
    font-size: 14px;
  }
  .dialog-action-btns {
    display: flex;
    margin-top: auto;
    border-top: 1px solid #d7d7d7;
    .dialog-action-btn {
      flex: 1;
      padding: 16px;
      transition: background .2s;
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
        border-left: 1px solid #d7d7d7;
      }
    }
  }
}
</style>
