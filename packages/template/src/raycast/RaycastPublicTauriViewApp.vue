<script setup lang="ts">
/**
 * Public Tauri wujie 内嵌视图：连接宿主事件与 `channel`，对 Worker snapshot 反序列化后交给 RaycastViewBody 渲染。
 * 首次收到完整快照后，后续 Worker 仅下发 JSON Patch 增量变更，前端 apply 后再 hydrate。
 */
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { channel, updateSearchBarVisible } from '@public-tauri/api';
import type { RaycastViewSnapshot, JsonPatchOp } from './types';
import { hydrateRaycastViewSnapshot, type HydrateSnapshotContext } from './hydrate-snapshot-funcs';
import { applyJsonPatch } from './json-patch';
import { getRaycastViewWujieProps } from './wujie-utils';
import RaycastViewBody from './RaycastViewBody.vue';

const activeCommandNameRef = ref('');
const snapshot = shallowRef<RaycastViewSnapshot | null>(null);

let rawSnapshot: RaycastViewSnapshot | null = null;
let unsubSnapshot: (() => void) | undefined;
let unsubPatch: (() => void) | undefined;
let unsubFormRefHandler: (() => void) | undefined;
let eventsTarget: EventTarget | null = null;

function hydrateCtx(): HydrateSnapshotContext {
  return {
    getCommandName: () => activeCommandNameRef.value || rawSnapshot?.commandName || '',
    dispatch: payload => channel.invoke('raycast:view:run-action', payload),
  };
}

function onPluginAction(event: Event) {
  void (async () => {
    const detail = (event as CustomEvent).detail || {};
    const commandName = String(detail.command?.name || '');
    activeCommandNameRef.value = commandName;
    updateSearchBarVisible(true);
    const props = getRaycastViewWujieProps();
    await channel.invoke('raycast:view:mount', {
      commandName,
      query: detail.query || '',
      options: detail.options || {},
      preferences: props?.getPreferences?.() || {},
    });
  })();
}

function applyFormRefOp(payload: unknown) {
  const data = (payload || {}) as { refId?: unknown; op?: unknown; value?: unknown };
  const refId = typeof data.refId === 'string' ? data.refId : '';
  const op = typeof data.op === 'string' ? data.op : '';
  if (!refId || !op) return false;
  const el = document.querySelector(`[data-rv-form-ref="${refId}"]`) as HTMLElement | null;
  if (!el) return false;
  if (op === 'focus') {
    if ('focus' in el && typeof (el as any).focus === 'function') (el as any).focus();
    return true;
  }
  if (op === 'reset') {
    if (el instanceof HTMLInputElement) {
      const kind = el.dataset.rvFormKind || '';
      if (kind === 'checkbox') {
        el.checked = Boolean(data.value);
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      if (kind === 'date') {
        const v = data.value instanceof Date ? data.value.toISOString().slice(0, 10) : String(data.value || '');
        el.value = v;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      if (kind === 'file-picker') {
        const values = Array.isArray(data.value) ? data.value : [];
        el.dataset.rvFormValue = JSON.stringify(values);
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      el.value = String(data.value ?? '');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    if (el instanceof HTMLTextAreaElement) {
      el.value = String(data.value ?? '');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    if (el instanceof HTMLSelectElement) {
      const kind = el.dataset.rvFormKind || '';
      if (kind === 'tag-picker') {
        const selected = Array.isArray(data.value) ? data.value.map(String) : [];
        for (const option of [...el.options]) {
          option.selected = selected.includes(option.value);
        }
      } else {
        el.value = String(data.value ?? '');
      }
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  return false;
}

async function onPluginExit(event: Event) {
  rawSnapshot = null;
  snapshot.value = null;
  const commandName = String((event as CustomEvent).detail?.command?.name || activeCommandNameRef.value || '');
  if (commandName) {
    await channel.invoke('raycast:view:unmount', { commandName });
  }
}

onMounted(() => {
  const props = getRaycastViewWujieProps();
  const events = props?.events;
  if (!events) {
    console.error('[template] Raycast view: window.$wujie.props.events is missing');
    return;
  }
  eventsTarget = events;
  events.addEventListener('plugin:action', onPluginAction as (_event: Event) => void);
  events.addEventListener('plugin:exit', onPluginExit as (_event: Event) => void);

  unsubSnapshot = channel.on('raycast:view:snapshot', (nextSnapshot: RaycastViewSnapshot) => {
    const cmd = activeCommandNameRef.value;
    if (cmd && nextSnapshot.commandName !== cmd) return;
    rawSnapshot = nextSnapshot;
    snapshot.value = hydrateRaycastViewSnapshot(rawSnapshot, hydrateCtx());
  });

  unsubPatch = channel.on('raycast:view:patch', (patches: JsonPatchOp[]) => {
    if (!rawSnapshot) return;
    rawSnapshot = applyJsonPatch(rawSnapshot, patches) as RaycastViewSnapshot;
    snapshot.value = hydrateRaycastViewSnapshot(rawSnapshot, hydrateCtx());
  });

  unsubFormRefHandler = channel.handle('raycast:view:form-item-ref', payload => applyFormRefOp(payload));
});

onBeforeUnmount(() => {
  unsubSnapshot?.();
  unsubPatch?.();
  unsubFormRefHandler?.();
  rawSnapshot = null;
  if (eventsTarget) {
    eventsTarget.removeEventListener('plugin:action', onPluginAction as (_event: Event) => void);
    eventsTarget.removeEventListener('plugin:exit', onPluginExit as (_event: Event) => void);
  }
});
</script>

<template>
  <RaycastViewBody
    v-if="snapshot"
    :snapshot="snapshot"
  />
</template>

<style lang="scss">
html, body, #raycast-app {
  height: 100%;
}
:root {
  color-scheme: light dark;
}
</style>
