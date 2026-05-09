<script setup lang="ts">
import { showOpenFilePicker } from '@public-tauri/api';
import { computed, nextTick, ref, watch } from 'vue';
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
const triggerRef = ref<HTMLDivElement>();
const selectedRef = ref<string[]>([]);
const openingRef = ref(false);

const isDirectoryMode = computed(() => Boolean(props.canChooseDirectories) && props.canChooseFiles === false);
const allowMultiple = computed(() => Boolean(props.allowMultipleSelection ?? true));

const placeholder = computed(() => {
  if (isDirectoryMode.value) return 'Choose directory…';
  return allowMultiple.value ? 'Choose files…' : 'Choose file…';
});

const valueJson = computed(() => JSON.stringify(selectedRef.value));

function readInitialValues(): string[] {
  const id = props.id || '';
  const stored = props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  const raw = props.value ?? stored ?? props.defaultValue;
  if (!Array.isArray(raw)) return [];
  return raw.map(item => String(item));
}

selectedRef.value = readInitialValues();

watch(
  () => (Array.isArray(props.value) ? props.value.map(String) : null),
  (next) => {
    if (!next) return;
    if (next.length === selectedRef.value.length
      && next.every((value, idx) => value === selectedRef.value[idx])) {
      return;
    }
    selectedRef.value = next;
  },
);

function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return idx >= 0 ? path.slice(idx + 1) : path;
}

function commitChange(next: string[]) {
  selectedRef.value = next;
  if (inputRef.value) {
    inputRef.value.dataset.rvFormValue = JSON.stringify(next);
  }
  props.onFieldValueChange?.(next);
  if (typeof props.onChange === 'function') {
    void props.onChange(next);
  }
}

function emitFormEvent(type: 'focus' | 'blur', value: unknown) {
  const callback = type === 'focus' ? props.onFocus : props.onBlur;
  if (typeof callback !== 'function') return;
  void callback({ type, target: { id: props.id || '', value } });
}

useRefHandle(() => props.__refId, {
  focus: () => triggerRef.value?.focus(),
  reset: (value) => {
    const next = Array.isArray(value) ? value.map(String) : [];
    commitChange(next);
  },
});

function removeFile(index: number) {
  commitChange(selectedRef.value.filter((_, i) => i !== index));
  void nextTick(() => triggerRef.value?.focus());
}

async function openPicker() {
  if (typeof showOpenFilePicker !== 'function' || openingRef.value) return;
  openingRef.value = true;
  try {
    const result = await showOpenFilePicker({
      directory: isDirectoryMode.value,
      multiple: allowMultiple.value,
      title: props.title,
    });
    if (result == null) return;
    const picked = Array.isArray(result) ? result.map(String) : [String(result)];
    const filtered = picked.filter(Boolean);
    if (!filtered.length) return;
    if (allowMultiple.value) {
      const seen = new Set(selectedRef.value);
      const merged = [...selectedRef.value];
      for (const path of filtered) {
        if (!seen.has(path)) {
          seen.add(path);
          merged.push(path);
        }
      }
      commitChange(merged);
    } else {
      commitChange(filtered.slice(0, 1));
    }
  } catch (error) {
    console.error('[RaycastFormFilePicker] showOpenFilePicker failed', error);
  } finally {
    openingRef.value = false;
  }
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    void openPicker();
  }
}
</script>

<template>
  <div class="rv-form-field">
    <span class="rv-form-label">{{ title ?? id }}</span>
    <div
      class="rv-file-picker"
      :class="{ 'rv-file-picker-error': Boolean(error), 'rv-file-picker-busy': openingRef }"
    >
      <div
        ref="triggerRef"
        class="rv-file-picker-control"
        role="button"
        tabindex="0"
        :aria-disabled="openingRef"
        :data-rv-auto-focus="Boolean(autoFocus)"
        @click="openPicker"
        @keydown="onTriggerKeydown"
        @focus="emitFormEvent('focus', selectedRef)"
        @blur="emitFormEvent('blur', selectedRef)"
      >
        <span
          v-for="(path, idx) in selectedRef"
          :key="path"
          class="rv-file-chip"
          :title="path"
        >
          <span class="rv-file-chip-icon">{{ isDirectoryMode ? '📁' : '📄' }}</span>
          <span class="rv-file-chip-title">{{ basename(path) }}</span>
          <button
            type="button"
            class="rv-file-chip-remove"
            tabindex="-1"
            aria-label="Remove file"
            @mousedown.prevent
            @click.stop="removeFile(idx)"
          >×</button>
        </span>
        <span
          v-if="!selectedRef.length"
          class="rv-file-picker-placeholder"
        >{{ placeholder }}</span>
        <span
          v-else-if="allowMultiple"
          class="rv-file-picker-add-hint"
        >+ Add</span>
      </div>
      <input
        ref="inputRef"
        type="hidden"
        :data-rv-form-id="String(id ?? '')"
        data-rv-form-kind="file-picker"
        :data-rv-form-value="valueJson"
      >
    </div>
    <small
      v-if="info || error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(error) }"
    >{{ error ?? info }}</small>
  </div>
</template>

<style>
@import './rv-form-shared.css';
</style>
