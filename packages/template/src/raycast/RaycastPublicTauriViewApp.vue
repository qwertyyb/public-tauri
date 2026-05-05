<script setup lang="ts">
/**
 * Public Tauri wujie 内嵌视图：连接宿主事件与 `channel`，对 Worker snapshot 反序列化后交给 RaycastViewBody 渲染。
 */
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { channel, updateSearchBarVisible } from '@public-tauri/api';
import type { RaycastViewSnapshot } from './types';
import { hydrateRaycastViewSnapshot } from './hydrate-snapshot-funcs';
import { getRaycastViewWujieProps } from './wujie-utils';
import RaycastViewBody from './RaycastViewBody.vue';

const activeCommandNameRef = ref('');
const snapshot = shallowRef<RaycastViewSnapshot | null>(null);

let unsubSnapshot: (() => void) | undefined;
let eventsTarget: EventTarget | null = null;

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

function onPluginExit(event: Event) {
  void (async () => {
    const commandName = String((event as CustomEvent).detail?.command?.name || activeCommandNameRef.value || '');
    try {
      if (commandName) {
        await channel.invoke('raycast:view:unmount', { commandName });
      }
    } finally {
      snapshot.value = null;
    }
  })();
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
    snapshot.value = hydrateRaycastViewSnapshot(nextSnapshot, {
      getCommandName: () => activeCommandNameRef.value || nextSnapshot.commandName,
      dispatch: payload => channel.invoke('raycast:view:run-action', payload),
    });
  });
});

onBeforeUnmount(() => {
  unsubSnapshot?.();
  if (eventsTarget) {
    eventsTarget.removeEventListener('plugin:action', onPluginAction as (_event: Event) => void);
    eventsTarget.removeEventListener('plugin:exit', onPluginExit as (_event: Event) => void);
  }
});
</script>

<template>
  <RaycastViewBody :snapshot="snapshot" />
</template>

<style lang="scss">
html, body, #raycast-app {
  height: 100%;
}
:root {
  color-scheme: light dark;
}
</style>
