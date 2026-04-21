<template>
  <div class="action-bar">
    <ActionPanel
      v-if="leftActionPanel"
      position="left"
      :title="leftActionPanel.title"
      :actions="leftActionPanel.actions"
      :visible="visiblePanel === 'left'"
      @toggle="togglePanel('left')"
      @close="closePanel"
    >
      <template #trigger>
        <slot name="left-trigger">
          <img
            src="../assets/logo.png"
            alt=""
            class="logo"
          >
        </slot>
      </template>
    </ActionPanel>
    <div
      v-if="mainAction"
      class="main-action"
      @click="mainAction.action?.()"
    >
      <span class="main-action-label">{{ mainAction.title || mainAction.name }}</span>
      <span class="main-action-key">↵</span>
    </div>
    <div
      v-if="mainAction && rightActionPanel?.actions?.length"
      class="divider"
    />
    <ActionPanel
      v-if="rightActionPanel?.actions?.length"
      position="right"
      :title="rightActionPanel.title"
      :actions="rightActionPanel.actions"
      :visible="visiblePanel === 'right'"
      @toggle="togglePanel('right')"
      @close="closePanel"
    >
      <template #trigger>
        <div class="right-trigger-row">
          <div class="right-trigger-inner">
            <slot name="right-trigger">
              <div class="more-actions">
                更多操作
              </div>
            </slot>
          </div>
          <span
            class="action-key-hint"
            :title="rightPanelShortcutTitle"
          >{{ rightPanelShortcutLabel }}</span>
        </div>
      </template>
    </ActionPanel>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ActionPanel from './ActionPanel.vue';
import type { ActionPanelAction } from '@/types/plugin';

export interface ActionPanel {
  title?: string;
  actions: ActionPanelAction[];
}

const props = defineProps<{
  leftActionPanel?: ActionPanel;
  rightActionPanel?: ActionPanel;
  mainAction?: ActionPanelAction;
}>();

const emits = defineEmits<{
  'panel-opened': ['left' | 'right'],
  'panel-closed': ['left' | 'right']
}>();

const visiblePanel = ref<'left' | 'right' | ''>();

const isApplePlatform = typeof navigator !== 'undefined'
  && /Mac|iPhone|iPod|iPad/i.test(navigator.platform ?? navigator.userAgent ?? '');

/** 与 PublicLayout 中 ⌘K / Ctrl+K 打开右侧面板一致，仅作展示 */
const rightPanelShortcutLabel = computed(() => (isApplePlatform ? '⌘K' : '^K'));
const rightPanelShortcutTitle = computed(() => (isApplePlatform ? '⌘K' : 'Ctrl+K'));

const closePanel = () => {
  const panel = visiblePanel.value;
  visiblePanel.value = '';
  if (panel) {
    emits('panel-closed', panel);
  }
};

const togglePanel = (panel: 'left' | 'right') => {
  if (visiblePanel.value === panel) {
    closePanel();
  } else {
    visiblePanel.value = panel;
    emits('panel-opened', panel);
  }
};

/** 显式切换右侧面板（快捷键）：已在打开则关闭，否则打开并切到右侧 */
const toggleRightPanel = () => {
  if (!props.rightActionPanel?.actions?.length) return;
  togglePanel('right');
};

defineExpose({
  toggleRightPanel,
});
</script>

<style lang="scss" scoped>
.action-bar {
  --bar-height: var(--action-bar-height);
  display: flex;
  flex-direction: row;
  row-gap: 8px;
  width: 100%;
  height: var(--bar-height);
  min-height: var(--bar-height);
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  * {
    user-select: none;
    -webkit-user-select: none;
  }

  .logo {
    width: 18px;
    height: 18px;
    box-sizing: content-box;
    opacity: 0.6;
    @media (prefers-color-scheme: dark) {
      filter: brightness(0) invert(1);
    }
  }

  .main-action {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.1s ease;
    margin-left: auto;
    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
    }
    .main-action-label {
      font-size: 13px;
      opacity: 0.8;
    }
    .main-action-key {
      font-size: 12px;
      width: 22px;
      height: 22px;
      line-height: 22px;
      border-radius: 4px;
      text-align: center;
      background-color: light-dark(rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.12));
      border: 1px solid light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.2));
      box-sizing: border-box;
      margin-left: 4px;
    }
  }

  .right-trigger-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
  }

  .right-trigger-inner {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .action-key-hint {
    flex-shrink: 0;
    font-size: 11px;
    padding: 0 5px;
    min-width: 22px;
    height: 22px;
    line-height: 22px;
    border-radius: 4px;
    text-align: center;
    background-color: light-dark(rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.12));
    border: 1px solid light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.2));
    box-sizing: border-box;
    opacity: 0.85;
  }

  .divider {
    width: 1px;
    height: 18px;
    background-color: light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.15));
    margin: 0 4px;
  }
}
</style>
