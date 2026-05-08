<script setup lang="ts">
import { ref } from 'vue';
import { useRefHandle } from '../useRefHandle';

const props = defineProps<{
  id?: string;
  title?: string;
  value?: string;
  defaultValue?: string;
  storeValue?: boolean;
  autoFocus?: boolean;
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
    const v = value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '');
    inputRef.value.value = v;
    inputRef.value.dispatchEvent(new Event('change', { bubbles: true }));
  },
});

function dateValue(): string {
  const id = props.id || '';
  const stored = props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  const raw = props.value ?? stored ?? props.defaultValue;
  if (typeof raw !== 'string' || raw.length === 0) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
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
      type="date"
      :data-rv-form-id="String(id ?? '')"
      data-rv-form-kind="date"
      :data-rv-auto-focus="Boolean(autoFocus)"
      :value="dateValue()"
      @change="callChange(($event.target as HTMLInputElement).value ? new Date(($event.target as HTMLInputElement).value) : null)"
      @focus="emitFormEvent('focus', ($event.target as HTMLInputElement).value ? new Date(($event.target as HTMLInputElement).value) : null)"
      @blur="emitFormEvent('blur', ($event.target as HTMLInputElement).value ? new Date(($event.target as HTMLInputElement).value) : null)"
    >
  </label>
</template>
