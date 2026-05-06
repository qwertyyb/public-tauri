<script setup lang="ts">
import { computed } from 'vue';
import type { SerializedHostNode } from './types';
import RaycastFormNode from './RaycastFormNode.vue';

const props = defineProps<{
  node: SerializedHostNode;
}>();

type DropdownOption = { value: string; title: string; group?: string };

const dropdownOptions = computed<DropdownOption[]>(() => {
  if (props.node.type !== 'raycast:form-dropdown') return [];
  const out: DropdownOption[] = [];
  for (const child of props.node.children) {
    if (child.type === 'raycast:form-dropdown-item') {
      out.push({
        value: String(child.props.value ?? ''),
        title: String(child.props.title ?? child.props.value ?? ''),
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
  if (typeof fn === 'function') {
    void (fn as (next: unknown) => void)(value);
  }
}

function textValue(node: SerializedHostNode): string {
  if (typeof node.props.value === 'string') return node.props.value;
  if (typeof node.props.defaultValue === 'string') return node.props.defaultValue;
  return '';
}

function boolValue(node: SerializedHostNode): boolean {
  if (typeof node.props.value === 'boolean') return node.props.value;
  if (typeof node.props.defaultValue === 'boolean') return node.props.defaultValue;
  return false;
}

function dateValue(node: SerializedHostNode): string {
  const raw = node.props.value ?? node.props.defaultValue;
  if (typeof raw !== 'string' || raw.length === 0) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
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
      :placeholder="String(node.props.placeholder ?? '')"
      :value="textValue(node)"
      @input="callChange(node.props.onChange, ($event.target as HTMLInputElement).value)"
    >
    <small
      v-if="node.props.info || node.props.error"
      class="rv-form-help"
      :class="{ 'rv-form-help-error': Boolean(node.props.error) }"
    >{{ node.props.error ?? node.props.info }}</small>
  </label>

  <label
    v-else-if="node.type === 'raycast:form-password-field'"
    class="rv-form-field"
  >
    <span class="rv-form-label">{{ node.props.title ?? node.props.id }}</span>
    <input
      class="rv-form-input"
      type="password"
      :placeholder="String(node.props.placeholder ?? '')"
      :value="textValue(node)"
      @input="callChange(node.props.onChange, ($event.target as HTMLInputElement).value)"
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
      :placeholder="String(node.props.placeholder ?? '')"
      :value="textValue(node)"
      @input="callChange(node.props.onChange, ($event.target as HTMLTextAreaElement).value)"
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
      :checked="boolValue(node)"
      @change="callChange(node.props.onChange, ($event.target as HTMLInputElement).checked)"
    >
    <span>{{ node.props.label ?? node.props.title ?? node.props.id }}</span>
  </label>

  <label
    v-else-if="node.type === 'raycast:form-date-picker'"
    class="rv-form-field"
  >
    <span class="rv-form-label">{{ node.props.title ?? node.props.id }}</span>
    <input
      class="rv-form-input"
      type="date"
      :value="dateValue(node)"
      @change="callChange(node.props.onChange, ($event.target as HTMLInputElement).value ? new Date(($event.target as HTMLInputElement).value) : null)"
    >
  </label>

  <label
    v-else-if="node.type === 'raycast:form-dropdown'"
    class="rv-form-field"
  >
    <span class="rv-form-label">{{ node.props.title ?? node.props.id }}</span>
    <select
      class="rv-form-select"
      :value="String(node.props.value ?? node.props.defaultValue ?? '')"
      @change="callChange(node.props.onChange, ($event.target as HTMLSelectElement).value)"
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
          >{{ opt.title }}</option>
        </optgroup>
        <template v-else>
          <option
            v-for="opt in options"
            :key="opt.value"
            :value="opt.value"
          >{{ opt.title }}</option>
        </template>
      </template>
    </select>
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

.rv-form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--rv-text);
  font-size: 13px;
}
</style>
