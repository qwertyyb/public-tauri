<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SerializedHostNode } from '../types';
import { useRefHandle } from '../useRefHandle';

const props = defineProps<{
  id?: string;
  title?: string;
  value?: string[];
  defaultValue?: string[];
  storeValue?: boolean;
  autoFocus?: boolean;
  info?: string;
  error?: string;
  __refId?: string;
  children?: SerializedHostNode[];
  onChange?:(_value: unknown) => void;
  onFocus?: (_event: unknown) => void;
  onBlur?: (_event: unknown) => void;
  getStoredValue?: (_id: string) => unknown;
  onFieldValueChange?: (_value: unknown) => void;
}>();

const selectRef = ref<HTMLSelectElement>();

useRefHandle(() => props.__refId, {
  focus: () => selectRef.value?.focus(),
  reset: (value) => {
    if (!selectRef.value) return;
    const selected = Array.isArray(value) ? value.map(String) : [];
    for (const option of [...selectRef.value.options]) {
      option.selected = selected.includes(option.value);
    }
    selectRef.value.dispatchEvent(new Event('change', { bubbles: true }));
  },
});

const tagPickerItems = computed(() => (props.children || [])
  .filter(child => child.type === 'raycast:form-tag-picker-item')
  .map(child => ({
    value: String(child.props.value ?? ''),
    title: String(child.props.title ?? child.props.value ?? ''),
  })));

function tagPickerSelected(): string[] {
  const id = props.id || '';
  const stored = props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  const raw = props.value ?? stored ?? props.defaultValue;
  if (!Array.isArray(raw)) return [];
  return raw.map(item => String(item));
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
    <select
      ref="selectRef"
      class="rv-form-select"
      multiple
      :data-rv-form-id="String(id ?? '')"
      data-rv-form-kind="tag-picker"
      :data-rv-auto-focus="Boolean(autoFocus)"
      :value="tagPickerSelected()"
      @change="callChange([...(($event.target as HTMLSelectElement).selectedOptions || [])].map(option => option.value))"
      @focus="emitFormEvent('focus', [...(($event.target as HTMLSelectElement).selectedOptions || [])].map(option => option.value))"
      @blur="emitFormEvent('blur', [...(($event.target as HTMLSelectElement).selectedOptions || [])].map(option => option.value))"
    >
      <option
        v-for="opt in tagPickerItems"
        :key="opt.value"
        :value="opt.value"
      >{{ opt.title }}</option>
    </select>
    <small
      v-if="info || error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(error) }"
    >{{ error ?? info }}</small>
  </label>
</template>
