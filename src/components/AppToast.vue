<template>
  <dialog
    ref="dialog"
    class="app-toast"
  >
    <div class="toast-icon" />
    <div class="toast-message">
      {{ options.message }}
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue';

const props = defineProps<{
  options: IToastOptions
}>();

const dialog = useTemplateRef('dialog');

let timeout: ReturnType<typeof setTimeout> | null = null;
onMounted(() => {
  dialog.value?.show();
  timeout = setTimeout(() => {
    dialog.value?.close();
    props.options.done?.();
  }, props.options.duration || 1500);
});

onUnmounted(() => {
  dialog.value?.close();
  props.options.done?.();
  timeout && clearTimeout(timeout);
});

</script>

<style lang="scss" scoped>
.app-toast {
  position: fixed;
  left: 50%;
  bottom: 60px;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 8px 16px;
  font-size: 14px;
  pointer-events: none;
  outline: none;
  border: none;
  box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.3);
  animation: fade-in-up .3s ease-out forwards;
  @keyframes fade-in-up {
    0% {
      opacity: 0;
      transform: translateX(-50%) translateY(40px);
    }
    100% {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
}
</style>
