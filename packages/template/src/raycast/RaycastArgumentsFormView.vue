<script setup lang="ts">
import { type PluginShellAction, updateActions } from '@public-tauri/api';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { RaycastArgumentsFormCommand } from './types';

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

function safeUpdateActions(actions: PluginShellAction[]) {
  if (typeof window === 'undefined' || !window.$wujie) return;
  updateActions(actions);
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
      <p class="rv-args-desc">
        Fill required arguments, then use <strong>Run Command</strong> in the action bar (↵).
      </p>
    </header>

    <div class="rv-args-form">
      <label
        v-for="item in schemaRef"
        :key="item.name"
        class="rv-args-field"
      >
        <span class="rv-args-label">
          {{ item.name }}
          <span
            v-if="item.required"
            class="rv-args-required"
          >*</span>
        </span>
        <input
          v-if="item.type === 'text' || item.type === 'password'"
          :data-arg-name="item.name"
          :type="item.type === 'password' ? 'password' : 'text'"
          :placeholder="item.placeholder || ''"
          :value="valuesRef[item.name] || ''"
          class="rv-args-input"
          @input="valuesRef[item.name] = String(($event.target as HTMLInputElement).value || '')"
        >
        <select
          v-else-if="item.type === 'dropdown'"
          :data-arg-name="item.name"
          class="rv-args-select"
          :value="valuesRef[item.name] || ''"
          @change="valuesRef[item.name] = String(($event.target as HTMLSelectElement).value || '')"
        >
          <option
            v-for="option in item.data || []"
            :key="option.value"
            :value="option.value"
          >
            {{ option.title }}
          </option>
        </select>
        <span
          v-if="errorsRef[item.name]"
          class="rv-args-error"
          :data-arg-error="item.name"
        >
          {{ errorsRef[item.name] }}
        </span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.rv-args-shell {
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

.rv-args-desc {
  margin: 0;
  color: var(--rv-text-secondary);
  font-size: 12px;
}

.rv-args-desc strong {
  font-weight: 600;
  color: var(--rv-text);
}

.rv-args-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rv-args-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rv-args-label {
  font-size: 12px;
  color: var(--rv-text-secondary);
}

.rv-args-required {
  color: #ff453a;
}

.rv-args-input,
.rv-args-select {
  width: 100%;
  border: 1px solid var(--rv-border);
  border-radius: 8px;
  background: var(--rv-surface);
  color: var(--rv-text);
  padding: 8px 10px;
  font-size: 13px;
}

.rv-args-error {
  color: #ff7f7f;
  font-size: 12px;
}
</style>
