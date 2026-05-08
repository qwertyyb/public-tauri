<script setup lang="ts">
/**
 * Public Tauri wujie 内嵌视图：连接宿主事件与 `channel`，对 Worker snapshot 反序列化后交给 RaycastViewBody 渲染。
 * 首次收到完整快照后，后续 Worker 仅下发 JSON Patch 增量变更，前端 apply 后再 hydrate。
 */
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { channel } from '@public-tauri/api';
import type { RaycastViewSnapshot, JsonPatchOp } from './types';
import { hydrateRaycastViewSnapshot, type HydrateSnapshotContext } from './hydrate-snapshot-funcs';
import { applyJsonPatch } from './json-patch';
import { getRaycastViewWujieProps } from './wujie-utils';
import { invokeRefHandle } from './useRefHandle';
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
    const props = getRaycastViewWujieProps();
    await channel.invoke('raycast:view:mount', {
      commandName,
      query: detail.query || '',
      options: detail.options || {},
      preferences: props?.getPreferences?.() || {},
    });
  })();
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

  unsubFormRefHandler = channel.handle('raycast:view:ref-invoke', payload => invokeRefHandle(payload));
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
