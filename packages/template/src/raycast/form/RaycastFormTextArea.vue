<script setup lang="ts">
import { ref } from 'vue';
import { useRefHandle } from '../useRefHandle';

const props = defineProps<{
  id?: string;
  title?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  storeValue?: boolean;
  autoFocus?: boolean;
  info?: string;
  error?: string;
  __refId?: string;
  onChange?:(_value: unknown) => void;
  onFocus?: (_event: unknown) => void;
  onBlur?: (_event: unknown) => void;
  getStoredValue?: (_id: string) => unknown;
  onFieldValueChange?: (_value: unknown) => void;
}>();

const textareaRef = ref<HTMLTextAreaElement>();

useRefHandle(() => props.__refId, {
  focus: () => textareaRef.value?.focus(),
  reset: (value) => {
    if (!textareaRef.value) return;
    textareaRef.value.value = String(value ?? '');
    textareaRef.value.dispatchEvent(new Event('input', { bubbles: true }));
  },
});

function textValue(): string {
  if (typeof props.value === 'string') return props.value;
  const id = props.id || '';
  const stored = props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  if (typeof stored === 'string') return stored;
  if (typeof props.defaultValue === 'string') return props.defaultValue;
  return '';
}

function callChange(value: unknown) {
  props.onFieldValueChange?.(value);
  if (typeof props.onChange === 'function') {
    void props.onChange(value);
  }
}

function emitFormEvent(type: 'focus' | 'blur', value: unknown) {
  const callback = type === 'focus' ? props.onFocus : props.onBlur;
  if (typeof callback !== 'function') return;
  void callback({ type, target: { id: props.id || '', value } });
}
</script>

<template>
  <label class="rv-form-field">
    <span class="rv-form-label">{{ title ?? id }}</span>
    <textarea
      ref="textareaRef"
      class="rv-form-textarea"
      :data-rv-form-id="String(id ?? '')"
      data-rv-form-kind="text-area"
      :data-rv-auto-focus="Boolean(autoFocus)"
      :placeholder="String(placeholder ?? '')"
      :value="textValue()"
      @input="callChange(($event.target as HTMLTextAreaElement).value)"
      @focus="emitFormEvent('focus', ($event.target as HTMLTextAreaElement).value)"
      @blur="emitFormEvent('blur', ($event.target as HTMLTextAreaElement).value)"
    />
    <small
      v-if="info || error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(error) }"
    >{{ error ?? info }}</small>
  </label>
</template>

<style>
@import './rv-form-shared.css';
</style>
