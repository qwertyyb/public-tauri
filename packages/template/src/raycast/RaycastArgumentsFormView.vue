<script setup lang="ts">
import { type PluginShellAction, updateActions } from '@public-tauri/api';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { RaycastArgumentsFormCommand, RaycastCommandArgument, SerializedHostNode } from './types';
import RaycastFormDescription from './form/RaycastFormDescription.vue';
import RaycastFormDropdown from './form/RaycastFormDropdown.vue';
import RaycastFormPasswordField from './form/RaycastFormPasswordField.vue';
import RaycastFormTextField from './form/RaycastFormTextField.vue';

const props = defineProps<{
  command: RaycastArgumentsFormCommand;
  submitting?: boolean;
}>();

const schemaRef = computed(() => (Array.isArray(props.command.raycastArguments) ? props.command.raycastArguments : []));

const commandTitleRef = computed(() => (typeof props.command.title === 'string' && props.command.title.trim()
  ? props.command.title
  : props.command.name));

const emit = defineEmits<{
  submit: [values: Record<string, string>];
}>();

const valuesRef = ref<Record<string, string>>({});
const errorsRef = ref<Record<string, string>>({});
const formRootRef = ref<HTMLElement | null>(null);

function applyAutoFocus() {
  const root = formRootRef.value;
  if (!root) return;
  const target = root.querySelector<HTMLElement>('[data-rv-auto-focus="true"]');
  target?.focus({ preventScroll: true });
}

function safeUpdateActions(actions: PluginShellAction[]) {
  if (typeof window === 'undefined' || !window.$wujie) return;
  updateActions(actions);
}

function argumentFieldTitle(item: RaycastCommandArgument): string {
  return item.required ? `${item.name} *` : item.name;
}

function dropdownItems(item: RaycastCommandArgument): SerializedHostNode[] {
  if (item.type !== 'dropdown') return [];
  return (item.data || []).map((opt, i) => ({
    hostId: `rv-arg-dd-${item.name}-${i}`,
    type: 'raycast:form-dropdown-item',
    props: {
      value: opt.value,
      title: opt.title,
    },
    children: [],
  }));
}

function onArgChange(name: string, value: unknown) {
  valuesRef.value[name] = String(value ?? '');
}

function initValuesFromSchema() {
  const next: Record<string, string> = {};
  for (const item of schemaRef.value) {
    if (item.type === 'dropdown') {
      next[item.name] = item.data?.[0]?.value || '';
      continue;
    }
    next[item.name] = '';
  }
  valuesRef.value = next;
  errorsRef.value = {};
}

watch(schemaRef, () => {
  initValuesFromSchema();
}, { immediate: true });

watch(
  () => schemaRef.value.map(item => `${item.name}:${item.type}`).join('|'),
  async () => {
    if (!schemaRef.value.length) return;
    await nextTick();
    applyAutoFocus();
  },
  { flush: 'post', immediate: true },
);

onMounted(() => {
  void nextTick(applyAutoFocus);
});

function validate(): boolean {
  const nextErrors: Record<string, string> = {};
  for (const item of schemaRef.value) {
    const value = valuesRef.value[item.name] || '';
    if (item.required && !value.trim()) {
      nextErrors[item.name] = `${item.name} is required`;
      continue;
    }
    if (item.type === 'dropdown' && item.data?.length) {
      const allowed = new Set(item.data.map(opt => opt.value));
      if (!allowed.has(value)) {
        nextErrors[item.name] = `${item.name} has an invalid option`;
      }
    }
  }
  errorsRef.value = nextErrors;
  return Object.keys(nextErrors).length === 0;
}

function trySubmit() {
  if (props.submitting) return;
  if (!validate()) return;
  emit('submit', { ...valuesRef.value });
}

watch(
  () => [schemaRef.value.length, props.submitting] as const,
  () => {
    if (!schemaRef.value.length) {
      safeUpdateActions([]);
      return;
    }
    safeUpdateActions([{
      name: 'raycast-args-run-command',
      title: props.submitting ? 'Running...' : 'Run Command',
      icon: 'play_arrow',
      action: trySubmit,
    }]);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  safeUpdateActions([]);
});
</script>

<template>
  <section class="rv-args-shell">
    <header class="rv-args-header">
      <h3 class="rv-args-title">
        {{ commandTitleRef }}
      </h3>
      <RaycastFormDescription
        :text="'Fill required arguments, then use Run Command in the action bar (↵).'"
      />
    </header>

    <div
      ref="formRootRef"
      class="rv-args-form"
    >
      <template
        v-for="(item, index) in schemaRef"
        :key="item.name"
      >
        <RaycastFormTextField
          v-if="item.type === 'text'"
          :id="item.name"
          :title="argumentFieldTitle(item)"
          :placeholder="item.placeholder || ''"
          :value="valuesRef[item.name] ?? ''"
          :error="errorsRef[item.name]"
          :auto-focus="index === 0"
          :on-field-value-change="(v: unknown) => onArgChange(item.name, v)"
        />
        <RaycastFormPasswordField
          v-else-if="item.type === 'password'"
          :id="item.name"
          :title="argumentFieldTitle(item)"
          :placeholder="item.placeholder || ''"
          :value="valuesRef[item.name] ?? ''"
          :error="errorsRef[item.name]"
          :auto-focus="index === 0"
          :on-field-value-change="(v: unknown) => onArgChange(item.name, v)"
        />
        <RaycastFormDropdown
          v-else-if="item.type === 'dropdown'"
          :id="item.name"
          :title="argumentFieldTitle(item)"
          :value="valuesRef[item.name] ?? ''"
          :children="dropdownItems(item)"
          :error="errorsRef[item.name]"
          :auto-focus="index === 0"
          :on-field-value-change="(v: unknown) => onArgChange(item.name, v)"
        />
      </template>
    </div>
  </section>
</template>

<style scoped>
.rv-args-shell {
  --rv-font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  --rv-font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
  /* --rv-bg: light-dark(#f6f7f9, #1e1e1e); */
  --rv-surface: light-dark(#ffffff, #252526);
  --rv-surface-elevated: light-dark(#f3f4f6, #2d2d30);
  --rv-border: light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.08));
  --rv-text: light-dark(rgba(0, 0, 0, 0.8), rgba(255, 255, 255, 0.8));
  --rv-text-secondary: light-dark(rgba(0, 0, 0, 0.48), rgba(255, 255, 255, 0.48));
  --rv-accent: light-dark(#1f2937, #f7f7f7);
  --rv-row-hover: light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.06));
  --rv-row-selected: light-dark(rgba(10, 132, 255, 0.14), rgba(10, 132, 255, 0.22));
  --rv-row-selected-border: light-dark(rgba(10, 132, 255, 0.42), rgba(10, 132, 255, 0.55));
  /* --rv-detail-bg: light-dark(#fafbfc, #232323); */
  --rv-radius: 10px;
  --rv-shadow: light-dark(0 8px 24px rgba(15, 23, 42, 0.12), 0 12px 40px rgba(0, 0, 0, 0.35));

  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.rv-args-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rv-args-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--rv-text);
}

.rv-args-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>

<!-- <style>
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
</style> -->

