<script setup lang="ts">
import { type PluginShellAction, storage, updateActions } from '@public-tauri/api';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import RaycastFormNode from '../RaycastFormNode.vue';
import { actionDisplayTitle, collectRaycastActions, iconPropToDisplay } from '../host-tree';
import type { SerializedHostActionNode, SerializedHostNode } from '../types';

const props = withDefaults(defineProps<{
  node: SerializedHostNode;
  commandName?: string;
  actions?: SerializedHostNode;
  isLoading?: boolean;
}>(), {
  commandName: '',
  actions: undefined,
  isLoading: false,
});

function safeUpdateActions(actions: PluginShellAction[]) {
  if (typeof window === 'undefined' || !window.$wujie) return;
  updateActions(actions);
}

const formRootRef = ref<HTMLElement | null>(null);
const storeValuesRef = ref<Record<string, unknown>>({});
const storageKey = computed(() => `raycast:view:form:${props.commandName || 'default'}`);

async function loadStoredValues() {
  try {
    const loaded = await storage.getItem(storageKey.value);
    storeValuesRef.value = loaded && typeof loaded === 'object' ? loaded as Record<string, unknown> : {};
  } catch {
    storeValuesRef.value = {};
  }
}

async function persistStoredValues() {
  try {
    await storage.setItem(storageKey.value, { ...storeValuesRef.value });
  } catch {
    // ignore persistence errors in view compatibility mode
  }
}

function getStoredValue(id: string): unknown {
  return storeValuesRef.value[id];
}

function handleFieldValueChange(node: SerializedHostNode, value: unknown) {
  const id = String(node.props.id || '');
  if (!id) return;
  if (Boolean(node.props.storeValue)) {
    storeValuesRef.value[id] = value;
    void persistStoredValues();
  }
}

function applyAutoFocus() {
  const root = formRootRef.value;
  if (!root) return;
  const target = root.querySelector<HTMLElement>('[data-rv-auto-focus="true"]');
  if (target && typeof (target as any).focus === 'function') {
    (target as any).focus();
  }
}

function collectFormValues(): Record<string, unknown> {
  const root = formRootRef.value;
  if (!root) return {};
  const elements = root.querySelectorAll<HTMLElement>('[data-rv-form-id]');
  const values: Record<string, unknown> = {};
  elements.forEach((el) => {
    const id = el.dataset.rvFormId || '';
    if (!id || values[id] !== undefined) return;
    const kind = el.dataset.rvFormKind || '';
    if (el instanceof HTMLInputElement) {
      if (kind === 'checkbox') {
        values[id] = el.checked;
        return;
      }
      if (kind === 'date') {
        values[id] = el.value ? new Date(el.value) : null;
        return;
      }
      if (kind === 'file-picker') {
        const raw = el.dataset.rvFormValue || '[]';
        try {
          values[id] = JSON.parse(raw);
        } catch {
          values[id] = [];
        }
        return;
      }
      values[id] = el.value;
      return;
    }
    if (el instanceof HTMLTextAreaElement) {
      values[id] = el.value;
      return;
    }
    if (el instanceof HTMLSelectElement) {
      if (kind === 'tag-picker') {
        values[id] = [...el.selectedOptions].map(option => option.value);
      } else {
        values[id] = el.value;
      }
    }
  });
  return values;
}

const formActions = computed(() => {
  const rootActions = props.actions ? collectRaycastActions(props.actions) : [];
  const treeActions = collectRaycastActions(props.node);
  const dedup = new Map<string, SerializedHostActionNode>();
  for (const node of [...rootActions, ...treeActions]) {
    if (node.type === 'raycast:action') dedup.set(node.hostId, node as SerializedHostActionNode);
  }
  return [...dedup.values()];
});

watch(
  formActions,
  () => {
    safeUpdateActions(formActions.value.map(action => ({
      name: action.hostId,
      title: actionDisplayTitle(action),
      icon: iconPropToDisplay(action.props.icon),
      shortcut: action.props.shortcut as { modifiers?: string[]; key?: string } | undefined,
      action: () => {
        const run = action.props.onSubmit ?? action.props.onAction;
        if (typeof run === 'function') {
          const values = collectFormValues();
          void (run as (_values?: Record<string, unknown>) => void)(values);
        }
      },
    })));
  },
  { immediate: true },
);

watch(
  () => props.commandName,
  () => {
    void loadStoredValues().then(() => nextTick(applyAutoFocus));
  },
  { immediate: true },
);

onMounted(() => {
  void nextTick(applyAutoFocus);
});

onBeforeUnmount(() => {
  safeUpdateActions([]);
});
</script>

<template>
  <section
    ref="formRootRef"
    class="rv-form-shell"
  >
    <div
      v-if="isLoading"
      class="rv-form-loading-bar"
      aria-busy="true"
    />
    <div class="rv-form-body">
      <RaycastFormNode
        v-for="child in node.children"
        :key="child.hostId"
        :node="child"
        :get-stored-value="getStoredValue"
        :on-field-value-change="handleFieldValueChange"
      />
    </div>
  </section>
</template>

<style scoped>
.rv-form-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* background: var(--rv-surface); */
}

.rv-form-loading-bar {
  flex-shrink: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--rv-accent, #6ae3ff),
    transparent
  );
  background-size: 200% 100%;
  animation: rv-form-loading-shimmer 1.2s ease-in-out infinite;
}

@keyframes rv-form-loading-shimmer {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}

.rv-form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  overflow: auto;
}
</style>
