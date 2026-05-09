<script setup lang="ts">
import { ref } from 'vue';
import { useRefHandle } from '../useRefHandle';

const props = defineProps<{
  id?: string;
  title?: string;
  label?: string;
  value?: boolean;
  defaultValue?: boolean;
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

const inputRef = ref<HTMLInputElement>();

useRefHandle(() => props.__refId, {
  focus: () => inputRef.value?.focus(),
  reset: (value) => {
    if (!inputRef.value) return;
    inputRef.value.checked = Boolean(value);
    inputRef.value.dispatchEvent(new Event('change', { bubbles: true }));
  },
});

function boolValue(): boolean {
  if (typeof props.value === 'boolean') return props.value;
  const id = props.id || '';
  const stored = props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  if (typeof stored === 'boolean') return stored;
  if (typeof props.defaultValue === 'boolean') return props.defaultValue;
  return false;
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
  <label class="rv-form-checkbox">
    <input
      ref="inputRef"
      type="checkbox"
      :data-rv-form-id="String(id ?? '')"
      data-rv-form-kind="checkbox"
      :data-rv-auto-focus="Boolean(autoFocus)"
      :checked="boolValue()"
      @change="callChange(($event.target as HTMLInputElement).checked)"
      @focus="emitFormEvent('focus', ($event.target as HTMLInputElement).checked)"
      @blur="emitFormEvent('blur', ($event.target as HTMLInputElement).checked)"
    >
    <span>{{ label ?? title ?? id }}</span>
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
