<script setup lang="ts">
import { computed } from 'vue';
import type { SerializedHostNode } from './types';
import { iconPropToDisplay } from './host-tree';
import RaycastDetailMarkdown from './RaycastDetailMarkdown.vue';
import RaycastFormNode from './RaycastFormNode.vue';

const props = defineProps<{
  node: SerializedHostNode;
  getStoredValue?:(_id: string) => unknown;
  onFieldValueChange?:(_node: SerializedHostNode, _value: unknown) => void;
}>();

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
  if (props.node.type !== 'raycast:form-dropdown') return [];
  const out: DropdownOption[] = [];
  for (const child of props.node.children) {
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

function callChange(fn: unknown, value: unknown) {
  props.onFieldValueChange?.(props.node, value);
  if (typeof fn === 'function') {
    void (fn as (_next: unknown) => void)(value);
  }
}

function emitFormEvent(node: SerializedHostNode, type: 'focus' | 'blur', value: unknown) {
  const callback = type === 'focus' ? node.props.onFocus : node.props.onBlur;
  if (typeof callback !== 'function') return;
  const id = String(node.props.id || '');
  void (callback as (_event: { type: 'focus' | 'blur'; target: { id: string; value?: unknown } }) => void)({
    type,
    target: { id, value: value as any },
  });
}

function textValue(node: SerializedHostNode): string {
  if (typeof node.props.value === 'string') return node.props.value;
  const id = String(node.props.id || '');
  const stored = node.props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  if (typeof stored === 'string') return stored;
  if (typeof node.props.defaultValue === 'string') return node.props.defaultValue;
  return '';
}

function boolValue(node: SerializedHostNode): boolean {
  if (typeof node.props.value === 'boolean') return node.props.value;
  const id = String(node.props.id || '');
  const stored = node.props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  if (typeof stored === 'boolean') return stored;
  if (typeof node.props.defaultValue === 'boolean') return node.props.defaultValue;
  return false;
}

function dateValue(node: SerializedHostNode): string {
  const id = String(node.props.id || '');
  const stored = node.props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  const raw = node.props.value ?? stored ?? node.props.defaultValue;
  if (typeof raw !== 'string' || raw.length === 0) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

const tagPickerItems = computed(() => {
  if (props.node.type !== 'raycast:form-tag-picker') return [];
  return props.node.children
    .filter(child => child.type === 'raycast:form-tag-picker-item')
    .map(child => ({
      value: String(child.props.value ?? ''),
      title: String(child.props.title ?? child.props.value ?? ''),
    }));
});

function tagPickerSelected(node: SerializedHostNode): string[] {
  const id = String(node.props.id || '');
  const stored = node.props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  const raw = node.props.value ?? stored ?? node.props.defaultValue;
  if (!Array.isArray(raw)) return [];
  return raw.map(item => String(item));
}

function filePickerStoredValues(node: SerializedHostNode): string {
  const id = String(node.props.id || '');
  const stored = node.props.storeValue && id ? props.getStoredValue?.(id) : undefined;
  const raw = node.props.value ?? stored ?? node.props.defaultValue;
  if (!Array.isArray(raw)) return '[]';
  return JSON.stringify(raw.map(item => String(item)));
}

function filePickerChange(node: SerializedHostNode, target: HTMLInputElement) {
  const input = target;
  const fileList = target.files ? [...target.files] : [];
  const values = fileList.map(file => String((file as any).path || file.name));
  input.dataset.rvFormValue = JSON.stringify(values);
  callChange(node.props.onChange, values);
}
</script>

<template>
  <p
    v-if="node.type === 'raycast:form-description'"
    class="rv-form-description"
  >
    {{ node.props.text ?? '' }}
  </p>

  <hr
    v-else-if="node.type === 'raycast:form-separator'"
    class="rv-form-separator"
  >

  <label
    v-else-if="node.type === 'raycast:form-text-field'"
    class="rv-form-field"
  >
    <span class="rv-form-label">{{ node.props.title ?? node.props.id }}</span>
    <input
      class="rv-form-input"
      type="text"
      :data-rv-form-id="String(node.props.id ?? '')"
      data-rv-form-kind="text"
      :data-rv-form-ref="String(node.props.__formRefId ?? '')"
      :data-rv-auto-focus="Boolean(node.props.autoFocus)"
      :placeholder="String(node.props.placeholder ?? '')"
      :value="textValue(node)"
      @input="callChange(node.props.onChange, ($event.target as HTMLInputElement).value)"
      @focus="emitFormEvent(node, 'focus', ($event.target as HTMLInputElement).value)"
      @blur="emitFormEvent(node, 'blur', ($event.target as HTMLInputElement).value)"
    >
    <small
      v-if="node.props.info || node.props.error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(node.props.error) }"
    >{{ node.props.error ?? node.props.info }}</small>
    <RaycastDetailMarkdown
      v-if="node.props.enableMarkdown && textValue(node).trim()"
      class="rv-form-markdown-preview"
      :markdown="textValue(node)"
    />
  </label>

  <label
    v-else-if="node.type === 'raycast:form-password-field'"
    class="rv-form-field"
  >
    <span class="rv-form-label">{{ node.props.title ?? node.props.id }}</span>
    <input
      class="rv-form-input"
      type="password"
      :data-rv-form-id="String(node.props.id ?? '')"
      data-rv-form-kind="password"
      :data-rv-form-ref="String(node.props.__formRefId ?? '')"
      :data-rv-auto-focus="Boolean(node.props.autoFocus)"
      :placeholder="String(node.props.placeholder ?? '')"
      :value="textValue(node)"
      @input="callChange(node.props.onChange, ($event.target as HTMLInputElement).value)"
      @focus="emitFormEvent(node, 'focus', ($event.target as HTMLInputElement).value)"
      @blur="emitFormEvent(node, 'blur', ($event.target as HTMLInputElement).value)"
    >
    <small
      v-if="node.props.info || node.props.error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(node.props.error) }"
    >{{ node.props.error ?? node.props.info }}</small>
  </label>

  <label
    v-else-if="node.type === 'raycast:form-text-area'"
    class="rv-form-field"
  >
    <span class="rv-form-label">{{ node.props.title ?? node.props.id }}</span>
    <textarea
      class="rv-form-textarea"
      :data-rv-form-id="String(node.props.id ?? '')"
      data-rv-form-kind="text-area"
      :data-rv-form-ref="String(node.props.__formRefId ?? '')"
      :data-rv-auto-focus="Boolean(node.props.autoFocus)"
      :placeholder="String(node.props.placeholder ?? '')"
      :value="textValue(node)"
      @input="callChange(node.props.onChange, ($event.target as HTMLTextAreaElement).value)"
      @focus="emitFormEvent(node, 'focus', ($event.target as HTMLTextAreaElement).value)"
      @blur="emitFormEvent(node, 'blur', ($event.target as HTMLTextAreaElement).value)"
    />
    <small
      v-if="node.props.info || node.props.error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(node.props.error) }"
    >{{ node.props.error ?? node.props.info }}</small>
  </label>

  <label
    v-else-if="node.type === 'raycast:form-checkbox'"
    class="rv-form-checkbox"
  >
    <input
      type="checkbox"
      :data-rv-form-id="String(node.props.id ?? '')"
      data-rv-form-kind="checkbox"
      :data-rv-form-ref="String(node.props.__formRefId ?? '')"
      :data-rv-auto-focus="Boolean(node.props.autoFocus)"
      :checked="boolValue(node)"
      @change="callChange(node.props.onChange, ($event.target as HTMLInputElement).checked)"
      @focus="emitFormEvent(node, 'focus', ($event.target as HTMLInputElement).checked)"
      @blur="emitFormEvent(node, 'blur', ($event.target as HTMLInputElement).checked)"
    >
    <span>{{ node.props.label ?? node.props.title ?? node.props.id }}</span>
    <small
      v-if="node.props.info || node.props.error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(node.props.error) }"
    >{{ node.props.error ?? node.props.info }}</small>
  </label>

  <label
    v-else-if="node.type === 'raycast:form-date-picker'"
    class="rv-form-field"
  >
    <span class="rv-form-label">{{ node.props.title ?? node.props.id }}</span>
    <input
      class="rv-form-input"
      type="date"
      :data-rv-form-id="String(node.props.id ?? '')"
      data-rv-form-kind="date"
      :data-rv-form-ref="String(node.props.__formRefId ?? '')"
      :data-rv-auto-focus="Boolean(node.props.autoFocus)"
      :value="dateValue(node)"
      @change="callChange(node.props.onChange, ($event.target as HTMLInputElement).value ? new Date(($event.target as HTMLInputElement).value) : null)"
      @focus="emitFormEvent(node, 'focus', ($event.target as HTMLInputElement).value ? new Date(($event.target as HTMLInputElement).value) : null)"
      @blur="emitFormEvent(node, 'blur', ($event.target as HTMLInputElement).value ? new Date(($event.target as HTMLInputElement).value) : null)"
    >
  </label>

  <label
    v-else-if="node.type === 'raycast:form-dropdown'"
    class="rv-form-field"
  >
    <span class="rv-form-label">{{ node.props.title ?? node.props.id }}</span>
    <select
      class="rv-form-select"
      :data-rv-form-id="String(node.props.id ?? '')"
      data-rv-form-kind="dropdown"
      :data-rv-form-ref="String(node.props.__formRefId ?? '')"
      :data-rv-auto-focus="Boolean(node.props.autoFocus)"
      :value="String(node.props.value ?? (node.props.storeValue ? getStoredValue?.(String(node.props.id || '')) : undefined) ?? node.props.defaultValue ?? '')"
      @change="callChange(node.props.onChange, ($event.target as HTMLSelectElement).value)"
      @focus="emitFormEvent(node, 'focus', ($event.target as HTMLSelectElement).value)"
      @blur="emitFormEvent(node, 'blur', ($event.target as HTMLSelectElement).value)"
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
      v-if="node.props.info || node.props.error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(node.props.error) }"
    >{{ node.props.error ?? node.props.info }}</small>
  </label>

  <label
    v-else-if="node.type === 'raycast:form-tag-picker'"
    class="rv-form-field"
  >
    <span class="rv-form-label">{{ node.props.title ?? node.props.id }}</span>
    <select
      class="rv-form-select"
      multiple
      :data-rv-form-id="String(node.props.id ?? '')"
      data-rv-form-kind="tag-picker"
      :data-rv-form-ref="String(node.props.__formRefId ?? '')"
      :data-rv-auto-focus="Boolean(node.props.autoFocus)"
      :value="tagPickerSelected(node)"
      @change="callChange(node.props.onChange, [...(($event.target as HTMLSelectElement).selectedOptions || [])].map(option => option.value))"
      @focus="emitFormEvent(node, 'focus', [...(($event.target as HTMLSelectElement).selectedOptions || [])].map(option => option.value))"
      @blur="emitFormEvent(node, 'blur', [...(($event.target as HTMLSelectElement).selectedOptions || [])].map(option => option.value))"
    >
      <option
        v-for="opt in tagPickerItems"
        :key="opt.value"
        :value="opt.value"
      >{{ opt.title }}</option>
    </select>
    <small
      v-if="node.props.info || node.props.error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(node.props.error) }"
    >{{ node.props.error ?? node.props.info }}</small>
  </label>

  <label
    v-else-if="node.type === 'raycast:form-file-picker'"
    class="rv-form-field"
  >
    <span class="rv-form-label">{{ node.props.title ?? node.props.id }}</span>
    <input
      class="rv-form-input"
      type="file"
      :multiple="Boolean(node.props.allowMultipleSelection ?? true)"
      :webkitdirectory="Boolean(node.props.canChooseDirectories && !node.props.canChooseFiles) ? 'webkitdirectory' : undefined"
      :directory="Boolean(node.props.canChooseDirectories && !node.props.canChooseFiles) ? 'directory' : undefined"
      :data-rv-form-id="String(node.props.id ?? '')"
      data-rv-form-kind="file-picker"
      :data-rv-form-ref="String(node.props.__formRefId ?? '')"
      :data-rv-auto-focus="Boolean(node.props.autoFocus)"
      :data-rv-form-value="filePickerStoredValues(node)"
      @change="filePickerChange(node, ($event.target as HTMLInputElement))"
      @focus="emitFormEvent(node, 'focus', JSON.parse(($event.target as HTMLInputElement).dataset.rvFormValue || '[]'))"
      @blur="emitFormEvent(node, 'blur', JSON.parse(($event.target as HTMLInputElement).dataset.rvFormValue || '[]'))"
    >
    <small
      v-if="node.props.info || node.props.error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(node.props.error) }"
    >{{ node.props.error ?? node.props.info }}</small>
  </label>

  <template v-else>
    <RaycastFormNode
      v-for="ch in node.children"
      :key="ch.hostId"
      :node="ch"
      :get-stored-value="getStoredValue"
      :on-field-value-change="onFieldValueChange"
    />
  </template>
</template>

<style scoped>
.rv-form-description {
  margin: 0;
  color: var(--rv-text-secondary);
  font-size: 12px;
}

.rv-form-separator {
  border: 0;
  border-top: 1px solid var(--rv-border);
  margin: 4px 0;
}

.rv-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rv-form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--rv-text);
}

.rv-form-input,
.rv-form-textarea,
.rv-form-select {
  width: 100%;
  border: 1px solid var(--rv-border);
  border-radius: 10px;
  background: var(--rv-surface-elevated, var(--rv-surface));
  color: var(--rv-text);
  font: inherit;
  font-size: 13px;
  padding: 8px 10px;
}

.rv-form-textarea {
  min-height: 96px;
  resize: vertical;
}

.rv-form-help {
  font-size: 11px;
  color: var(--rv-text-secondary);
}

.rv-form-help-error {
  color: #ff6b6b;
}

.rv-form-markdown-preview {
  border: 1px solid var(--rv-border);
  border-radius: 10px;
  background: var(--rv-surface);
  padding: 10px;
  font-size: 12px;
  color: var(--rv-text-secondary);
}

.rv-form-markdown-preview :deep(p) {
  margin: 0.35em 0;
}

.rv-form-markdown-preview :deep(pre) {
  margin: 0.35em 0;
  overflow: auto;
}

.rv-form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--rv-text);
  font-size: 13px;
}
</style>
