<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SerializedHostNode } from '../types';
import { iconPropToDisplay } from '../host-tree';
import { useRefHandle } from '../useRefHandle';

const props = defineProps<{
  id?: string;
  title?: string;
  value?: string;
  defaultValue?: string;
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
    selectRef.value.value = String(value ?? '');
    selectRef.value.dispatchEvent(new Event('change', { bubbles: true }));
  },
});

type DropdownOption = {
  value: string;
  title: string;
  group?: string;
  icon?: string;
  keywords?: string[];
  shortcut?: string;
};

function shortcutToText(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { key } = raw as { key?: unknown };
  if (typeof key !== 'string' || !key) return undefined;
  const { modifiers: modifiersRaw } = raw as { modifiers?: unknown };
  const modifiers = Array.isArray(modifiersRaw)
    ? modifiersRaw.map(part => String(part)).filter(Boolean)
    : [];
  return modifiers.length ? `${modifiers.join('+')}+${key}` : key;
}

function optionLabel(option: DropdownOption): string {
  return option.shortcut ? `${option.title} (${option.shortcut})` : option.title;
}

function optionHint(option: DropdownOption): string | undefined {
  const hints: string[] = [];
  if (option.icon) hints.push(`icon: ${option.icon}`);
  if (option.keywords?.length) hints.push(`keywords: ${option.keywords.join(', ')}`);
  return hints.length ? hints.join(' | ') : undefined;
}

const dropdownOptions = computed<DropdownOption[]>(() => {
  const out: DropdownOption[] = [];
  for (const child of (props.children || [])) {
    if (child.type === 'raycast:form-dropdown-item') {
      out.push({
        value: String(child.props.value ?? ''),
        title: String(child.props.title ?? child.props.value ?? ''),
        icon: iconPropToDisplay(child.props.icon),
        keywords: Array.isArray(child.props.keywords) ? child.props.keywords.map(word => String(word)) : undefined,
        shortcut: shortcutToText(child.props.shortcut),
      });
      continue;
    }
    if (child.type === 'raycast:form-dropdown-section') {
      const group = typeof child.props.title === 'string' ? child.props.title : undefined;
      for (const item of child.children) {
        if (item.type !== 'raycast:form-dropdown-item') continue;
        out.push({
          value: String(item.props.value ?? ''),
          title: String(item.props.title ?? item.props.value ?? ''),
          group,
          icon: iconPropToDisplay(item.props.icon),
          keywords: Array.isArray(item.props.keywords) ? item.props.keywords.map(word => String(word)) : undefined,
          shortcut: shortcutToText(item.props.shortcut),
        });
      }
    }
  }
  return out;
});

const groupedDropdownOptions = computed(() => {
  const groups = new Map<string, DropdownOption[]>();
  for (const option of dropdownOptions.value) {
    const key = option.group ?? '';
    const list = groups.get(key);
    if (list) list.push(option);
    else groups.set(key, [option]);
  }
  return [...groups.entries()];
});

function selectValue(): string {
  return String(props.value
    ?? (props.storeValue ? props.getStoredValue?.(props.id || '') : undefined)
    ?? props.defaultValue
    ?? '');
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
      :data-rv-form-id="String(id ?? '')"
      data-rv-form-kind="dropdown"
      :data-rv-auto-focus="Boolean(autoFocus)"
      :value="selectValue()"
      @change="callChange(($event.target as HTMLSelectElement).value)"
      @focus="emitFormEvent('focus', ($event.target as HTMLSelectElement).value)"
      @blur="emitFormEvent('blur', ($event.target as HTMLSelectElement).value)"
    >
      <template
        v-for="[groupTitle, options] in groupedDropdownOptions"
        :key="groupTitle || '__default__'"
      >
        <optgroup
          v-if="groupTitle"
          :label="groupTitle"
        >
          <option
            v-for="opt in options"
            :key="opt.value"
            :value="opt.value"
            :title="optionHint(opt)"
          >{{ optionLabel(opt) }}</option>
        </optgroup>
        <template v-else>
          <option
            v-for="opt in options"
            :key="opt.value"
            :value="opt.value"
            :title="optionHint(opt)"
          >{{ optionLabel(opt) }}</option>
        </template>
      </template>
    </select>
    <small
      v-if="info || error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(error) }"
    >{{ error ?? info }}</small>
  </label>
</template>
