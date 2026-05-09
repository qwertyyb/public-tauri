<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { SerializedHostNode } from '../types';
import { iconPropToDisplay } from '../host-tree';
import { useRefHandle } from '../useRefHandle';

const props = defineProps<{
  id?: string;
  title?: string;
  placeholder?: string;
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

type TagItem = { value: string; title: string; icon?: string };

const selectRef = ref<HTMLSelectElement>();
const inputRef = ref<HTMLInputElement>();
const containerRef = ref<HTMLElement>();

const filterRef = ref('');
const focusedRef = ref(false);
const highlightIndexRef = ref(0);
const selectedValuesRef = ref<string[]>([]);

const tagPickerItems = computed<TagItem[]>(() => (props.children || [])
  .filter(child => child.type === 'raycast:form-tag-picker-item')
  .map(child => ({
    value: String(child.props.value ?? ''),
    title: String(child.props.title ?? child.props.value ?? ''),
    icon: iconPropToDisplay(child.props.icon),
  })));

function readInitialValues(): string[] {
  const id = props.id || '';
  const stored = props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  const raw = props.value ?? stored ?? props.defaultValue;
  if (!Array.isArray(raw)) return [];
  return raw.map(item => String(item));
}

selectedValuesRef.value = readInitialValues();

watch(
  () => (Array.isArray(props.value) ? props.value.map(String) : null),
  (next) => {
    if (!next) return;
    if (next.length === selectedValuesRef.value.length
      && next.every((value, idx) => value === selectedValuesRef.value[idx])) {
      return;
    }
    selectedValuesRef.value = next;
  },
);

const selectedItems = computed<TagItem[]>(() => {
  const map = new Map(tagPickerItems.value.map(item => [item.value, item]));
  return selectedValuesRef.value.map(value => map.get(value) ?? { value, title: value });
});

const filteredOptions = computed<TagItem[]>(() => {
  const filter = filterRef.value.trim().toLowerCase();
  const selected = new Set(selectedValuesRef.value);
  return tagPickerItems.value.filter((item) => {
    if (selected.has(item.value)) return false;
    if (!filter) return true;
    return item.title.toLowerCase().includes(filter)
      || item.value.toLowerCase().includes(filter);
  });
});

watch(filteredOptions, (list) => {
  if (highlightIndexRef.value >= list.length) {
    highlightIndexRef.value = list.length ? list.length - 1 : 0;
  }
});

watch(filterRef, () => {
  highlightIndexRef.value = 0;
});

const showDropdown = computed(() => focusedRef.value && filteredOptions.value.length > 0);

function syncHiddenSelect(values: string[]) {
  const select = selectRef.value;
  if (!select) return;
  for (const option of [...select.options]) {
    option.selected = values.includes(option.value);
  }
}

function commitChange(next: string[]) {
  selectedValuesRef.value = next;
  void nextTick(() => syncHiddenSelect(next));
  props.onFieldValueChange?.(next);
  if (typeof props.onChange === 'function') {
    void props.onChange(next);
  }
}

function addTag(value: string) {
  if (selectedValuesRef.value.includes(value)) return;
  commitChange([...selectedValuesRef.value, value]);
  filterRef.value = '';
  highlightIndexRef.value = 0;
}

function removeTag(value: string) {
  if (!selectedValuesRef.value.includes(value)) return;
  commitChange(selectedValuesRef.value.filter(item => item !== value));
}

function emitFormEvent(type: 'focus' | 'blur', value: unknown) {
  const callback = type === 'focus' ? props.onFocus : props.onBlur;
  if (typeof callback !== 'function') return;
  void callback({ type, target: { id: props.id || '', value } });
}

useRefHandle(() => props.__refId, {
  focus: () => inputRef.value?.focus(),
  reset: (value) => {
    const next = Array.isArray(value) ? value.map(String) : [];
    commitChange(next);
  },
});

function onContainerMouseDown(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    event.preventDefault();
    inputRef.value?.focus();
  }
}

function onInputFocus() {
  focusedRef.value = true;
  emitFormEvent('focus', [...selectedValuesRef.value]);
}

function onInputBlur() {
  focusedRef.value = false;
  emitFormEvent('blur', [...selectedValuesRef.value]);
}

function onInputKeyDown(event: KeyboardEvent) {
  const list = filteredOptions.value;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (list.length) {
      highlightIndexRef.value = (highlightIndexRef.value + 1) % list.length;
    }
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (list.length) {
      highlightIndexRef.value = (highlightIndexRef.value - 1 + list.length) % list.length;
    }
    return;
  }
  if (event.key === 'Enter') {
    const target = list[highlightIndexRef.value];
    if (target) {
      event.preventDefault();
      addTag(target.value);
    }
    return;
  }
  if (event.key === 'Escape') {
    if (filterRef.value) {
      event.preventDefault();
      filterRef.value = '';
      return;
    }
    inputRef.value?.blur();
    return;
  }
  if (event.key === 'Backspace' && !filterRef.value && selectedValuesRef.value.length) {
    event.preventDefault();
    commitChange(selectedValuesRef.value.slice(0, -1));
  }
}

function onOptionMouseDown(event: MouseEvent, value: string) {
  event.preventDefault();
  addTag(value);
  void nextTick(() => inputRef.value?.focus());
}

function onChipRemoveMouseDown(event: MouseEvent, value: string) {
  event.preventDefault();
  removeTag(value);
  void nextTick(() => inputRef.value?.focus());
}
</script>

<template>
  <label class="rv-form-field">
    <span class="rv-form-label">{{ title ?? id }}</span>
    <div
      ref="containerRef"
      class="rv-tag-picker"
      :class="{ 'rv-tag-picker-focused': focusedRef, 'rv-tag-picker-error': Boolean(error) }"
    >
      <div
        class="rv-tag-picker-control"
        @mousedown="onContainerMouseDown"
      >
        <span
          v-for="item in selectedItems"
          :key="item.value"
          class="rv-tag-chip"
        >
          <span
            v-if="item.icon"
            class="rv-tag-chip-icon"
          >{{ item.icon }}</span>
          <span class="rv-tag-chip-title">{{ item.title }}</span>
          <button
            type="button"
            class="rv-tag-chip-remove"
            tabindex="-1"
            aria-label="Remove tag"
            @mousedown="onChipRemoveMouseDown($event, item.value)"
          >×</button>
        </span>
        <input
          ref="inputRef"
          v-model="filterRef"
          class="rv-tag-picker-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          :placeholder="selectedItems.length ? '' : (placeholder ?? 'Search...')"
          :data-rv-auto-focus="Boolean(autoFocus)"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @keydown="onInputKeyDown"
        >
      </div>
      <select
        ref="selectRef"
        class="rv-tag-picker-hidden-select"
        multiple
        tabindex="-1"
        aria-hidden="true"
        :data-rv-form-id="String(id ?? '')"
        data-rv-form-kind="tag-picker"
      >
        <option
          v-for="opt in tagPickerItems"
          :key="opt.value"
          :value="opt.value"
          :selected="selectedValuesRef.includes(opt.value)"
        >{{ opt.title }}</option>
      </select>
      <ul
        v-if="showDropdown"
        class="rv-tag-picker-options"
        role="listbox"
      >
        <li
          v-for="(opt, idx) in filteredOptions"
          :key="opt.value"
          class="rv-tag-picker-option"
          :class="{ 'rv-tag-picker-option-active': idx === highlightIndexRef }"
          role="option"
          :aria-selected="idx === highlightIndexRef"
          @mousedown="onOptionMouseDown($event, opt.value)"
          @mouseenter="highlightIndexRef = idx"
        >
          <span
            v-if="opt.icon"
            class="rv-tag-picker-option-icon"
          >{{ opt.icon }}</span>
          <span class="rv-tag-picker-option-title">{{ opt.title }}</span>
        </li>
      </ul>
    </div>
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
