<template>
  <div
    class="inputBar"
    tabindex="0"
    @pointerup="focusInput"
  >
    <input
      v-if="!disabled"
      id="main-input"
      ref="input"
      v-model="modelValue"
      autofocus
      spellcheck="false"
      autocorrect="off"
      autocomplete="false"
      class="input"
      @keydown="keyDownHandler"
      @compositionstart="compositionStartHandler"
      @compositionend="compositionEndHandler"
    >
    <div
      v-if="!disabled && !modelValue"
      class="input-placeholder"
    >
      {{ placeholder || 'Search...' }}
    </div>
    <div class="searchSpace" />
  </div>
</template>
<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';

const modelValue = defineModel<string>({ default: '' });
defineProps<{
  disabled?: boolean,
  placeholder?: string,
}>();
const emits = defineEmits<{ escape: [] }>();

const inputEl = useTemplateRef('input');

const keyDownHandler = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (modelValue.value) {
      event.preventDefault();
      modelValue.value = '';
    } else {
      event.preventDefault();
      emits('escape');
    }
  } else if (event.key === 'Backspace' && !modelValue.value && !event.isComposing) {
    event.preventDefault();
    emits('escape');
  }
};

const compositionStartHandler = () => {
  if (!inputEl.value?.classList.contains('composing')) {
    inputEl.value?.classList.add('composing');
  }
  inputEl.value?.focus();
};

const compositionEndHandler = () => {
  inputEl.value?.classList.remove('composing');
};

const focusInput = () => {
  inputEl.value?.focus();
};

onMounted(() => {
  setTimeout(() => {
    inputEl.value?.focus();
  });
});

</script>

<style lang="scss" scoped>
.inputBar {
  height: var(--input-bar-height, 48px);
  min-height: var(--input-bar-height, 48px);
  max-height: var(--input-bar-height, 48px);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  --padding-left: calc(var(--nav-width, 36px) + 16px);
}
.input {
  height: 42px;
  line-height: 42px;
  min-height: 42px;
  font-size: 18px;
  padding: 0 32px 0 var(--padding-left);
  min-width: 4em;
  box-sizing: border-box;
  outline: none;
  border: none;
  background: none;
  field-sizing: content;
  font-weight: 500;
  width: fit-content;
  min-width: 42px;
}
.input-placeholder {
  color: light-dark(rgba(0, 0, 0, 0.4), rgba(255, 255, 255, 0.4));
  position: absolute;
  left: var(--padding-left);
  top: 0;
  height: 48px;
  line-height: 48px;
  font-size: 16px;
  pointer-events: none;
  opacity: 0;
}
.input:empty + .input-placeholder {
  opacity: 1;
}
.input.composing + .input-placeholder {
  opacity: 0;
}
.searchSpace {
  flex: 1;
  height: 100%;
}
.appLogo {
  width: 36px;
  height: auto;
  cursor: pointer;
  padding: 6px;
  margin-left: auto;
}
</style>
