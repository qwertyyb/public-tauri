<script setup lang="ts">
import { ref } from 'vue';
import { useRefHandle } from '../useRefHandle';

const props = defineProps<{
  id?: string;
  title?: string;
  value?: string[];
  defaultValue?: string[];
  storeValue?: boolean;
  autoFocus?: boolean;
  allowMultipleSelection?: boolean;
  canChooseDirectories?: boolean;
  canChooseFiles?: boolean;
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
    const values = Array.isArray(value) ? value : [];
    inputRef.value.dataset.rvFormValue = JSON.stringify(values);
    inputRef.value.dispatchEvent(new Event('change', { bubbles: true }));
  },
});

function filePickerStoredValues(): string {
  const id = props.id || '';
  const stored = props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  const raw = props.value ?? stored ?? props.defaultValue;
  if (!Array.isArray(raw)) return '[]';
  return JSON.stringify(raw.map(item => String(item)));
}

function filePickerChange(target: HTMLInputElement) {
  const fileList = target.files ? [...target.files] : [];
  const values = fileList.map(file => String((file as any).path || file.name));
  target.dataset.rvFormValue = JSON.stringify(values);
  callChange(values);
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
    <input
      ref="inputRef"
      class="rv-form-input"
      type="file"
      :multiple="Boolean(allowMultipleSelection ?? true)"
      :webkitdirectory="Boolean(canChooseDirectories && !canChooseFiles) ? 'webkitdirectory' : undefined"
      :directory="Boolean(canChooseDirectories && !canChooseFiles) ? 'directory' : undefined"
      :data-rv-form-id="String(id ?? '')"
      data-rv-form-kind="file-picker"
      :data-rv-auto-focus="Boolean(autoFocus)"
      :data-rv-form-value="filePickerStoredValues()"
      @change="filePickerChange(($event.target as HTMLInputElement))"
      @focus="emitFormEvent('focus', JSON.parse(($event.target as HTMLInputElement).dataset.rvFormValue || '[]'))"
      @blur="emitFormEvent('blur', JSON.parse(($event.target as HTMLInputElement).dataset.rvFormValue || '[]'))"
    >
    <small
      v-if="info || error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(error) }"
    >{{ error ?? info }}</small>
  </label>
</template>
