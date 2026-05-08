<script setup lang="ts">
/**
 * Public Tauri wujie 内嵌视图：连接宿主事件与 `channel`，对 Worker snapshot 反序列化后交给 RaycastViewBody 渲染。
 * 首次收到完整快照后，后续 Worker 仅下发 JSON Patch 增量变更，前端 apply 后再 hydrate。
 */
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { channel, mainWindow, updateSearchBarVisible } from '@public-tauri/api';
import type {
  RaycastViewSnapshot,
  JsonPatchOp,
  RaycastCommandArgument,
  RaycastArgumentsFormCommand,
} from './types';
import { hydrateRaycastViewSnapshot, type HydrateSnapshotContext } from './hydrate-snapshot-funcs';
import { applyJsonPatch } from './json-patch';
import { getRaycastViewWujieProps } from './wujie-utils';
import { invokeRefHandle } from './useRefHandle';
import RaycastViewBody from './RaycastViewBody.vue';
import RaycastArgumentsFormView from './RaycastArgumentsFormView.vue';

const activeCommandNameRef = ref('');
const snapshot = shallowRef<RaycastViewSnapshot | null>(null);
const argsFormVisibleRef = ref(false);
const argsFormSubmittingRef = ref(false);
const argumentsFormCommandRef = ref<RaycastArgumentsFormCommand | null>(null);

let rawSnapshot: RaycastViewSnapshot | null = null;
let unsubSnapshot: (() => void) | undefined;
let unsubPatch: (() => void) | undefined;
let unsubFormRefHandler: (() => void) | undefined;
let eventsTarget: EventTarget | null = null;
let mountedViewCommandName = '';
type PendingLaunchContext = {
  commandName: string;
  query: string;
  options: Record<string, unknown>;
  preferences: Record<string, unknown>;
  targetMode: 'view' | 'no-view';
};

let pendingLaunchContext: PendingLaunchContext | null = null;

function mergeArgumentsIntoOptions(
  options: Record<string, unknown>,
  argumentsPayload: Record<string, string>,
) {
  const payload = (
    typeof options.payload === 'object' && options.payload !== null
      ? options.payload
      : {}
  ) as Record<string, unknown>;
  return {
    ...options,
    payload: {
      ...payload,
      arguments: argumentsPayload,
    },
  };
}

/** 无参数分支与 ArgumentsForm 提交共用：按 targetMode 调用 run 或 view:mount */
async function invokeRaycastLaunch(
  pending: PendingLaunchContext,
  options: Record<string, unknown>,
): Promise<void> {
  if (pending.targetMode === 'view') {
    await channel.invoke('raycast:view:mount', {
      commandName: pending.commandName,
      query: pending.query,
      options,
      preferences: pending.preferences,
    });
    mountedViewCommandName = pending.commandName;
    return;
  }
  await channel.invoke('raycast:run', {
    commandName: pending.commandName,
    query: pending.query,
    options,
    preferences: pending.preferences,
  });
  mainWindow.popToRoot();
}

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
    const command = (detail.command || {}) as Record<string, unknown>;
    const schema = Array.isArray(command.raycastArguments)
      ? (command.raycastArguments as RaycastCommandArgument[])
      : [];
    const query = String(detail.query || '');
    const options = typeof detail.options === 'object' && detail.options ? detail.options : {};
    const preferences = getRaycastViewWujieProps()?.getPreferences?.() || {};
    const targetMode = command.raycastTargetMode === 'no-view' ? 'no-view' : 'view';

    activeCommandNameRef.value = commandName;
    pendingLaunchContext = {
      commandName,
      query,
      options: options as Record<string, unknown>,
      preferences: preferences as Record<string, unknown>,
      targetMode,
    };
    snapshot.value = null;
    rawSnapshot = null;
    mountedViewCommandName = '';

    const needsArgumentsForm = schema.length > 0;
    argumentsFormCommandRef.value = needsArgumentsForm
      ? {
        name: commandName,
        title: typeof command.title === 'string' ? command.title : undefined,
        raycastArguments: schema,
      }
      : null;
    argsFormVisibleRef.value = needsArgumentsForm;
    updateSearchBarVisible(!needsArgumentsForm);

    if (!needsArgumentsForm) {
      const pending = pendingLaunchContext;
      if (pending) {
        await invokeRaycastLaunch(pending, pending.options);
      }
      pendingLaunchContext = null;
    }
  })();
}

function onSubmitArguments(values: Record<string, string>) {
  void (async () => {
    const pending = pendingLaunchContext;
    if (!pending?.commandName) return;
    argsFormSubmittingRef.value = true;
    try {
      const options = mergeArgumentsIntoOptions(pending.options, values);
      if (pending.targetMode === 'view') {
        argsFormVisibleRef.value = false;
        argumentsFormCommandRef.value = null;
        updateSearchBarVisible(true);
      }
      await invokeRaycastLaunch(pending, options);
      argsFormVisibleRef.value = false;
      argumentsFormCommandRef.value = null;
      pendingLaunchContext = null;
    } finally {
      argsFormSubmittingRef.value = false;
    }
  })();
}

async function onPluginExit(event: Event) {
  rawSnapshot = null;
  snapshot.value = null;
  argsFormVisibleRef.value = false;
  argumentsFormCommandRef.value = null;
  pendingLaunchContext = null;
  updateSearchBarVisible(false);
  const commandName = mountedViewCommandName || String((event as CustomEvent).detail?.command?.name || activeCommandNameRef.value || '');
  if (commandName && mountedViewCommandName) {
    await channel.invoke('raycast:view:unmount', { commandName: mountedViewCommandName });
  }
  mountedViewCommandName = '';
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
  <RaycastArgumentsFormView
    v-if="argsFormVisibleRef && argumentsFormCommandRef"
    :command="argumentsFormCommandRef"
    :submitting="argsFormSubmittingRef"
    @submit="onSubmitArguments"
  />
  <RaycastViewBody
    v-else-if="snapshot"
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
