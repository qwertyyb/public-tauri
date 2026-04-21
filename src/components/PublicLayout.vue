<template>
  <div class="public-layout">
    <div
      v-if="!noTop"
      class="layout-top"
    >
      <slot name="top" />
    </div>
    <div class="layout-divider" />
    <div class="layout-content">
      <slot />
    </div>
    <div class="layout-divider" />
    <ActionBar
      ref="actionBarRef"
      :left-action-panel="leftActionPanel"
      :right-action-panel="rightActionPanel"
      :main-action="mainAction"
      @panel-closed="$emit('panel-closed', $event)"
    >
      <template
        v-if="$slots['action-left-trigger']"
        #left-trigger
      >
        <slot name="action-left-trigger" />
      </template>
      <template
        v-if="$slots['action-right-trigger']"
        #right-trigger
      >
        <slot name="action-right-trigger" />
      </template>
    </ActionBar>
  </div>
</template>

<script setup lang="ts">
import ActionBar, { type ActionPanel } from '@/components/ActionBar.vue';
import { leftActionPanel as appLeftActionPanel } from '@/utils/app-action-bar';
import type { ActionPanelAction } from '@/types/plugin';
import {
  KEYBOARD_LAYER_PRIORITY_PUBLIC_LAYOUT,
  type KeyboardLayerHandle,
  registerKeyboardLayer,
} from '@/keyboard/keyboardLayer';
import { onPageEnter, onPageLeave } from '@/router';
import { useTemplateRef } from 'vue';

const props = withDefaults(defineProps<{
  leftActionPanel?: ActionPanel;
  rightActionPanel?: ActionPanel;
  mainAction?: ActionPanelAction;
  noTop?: boolean;
}>(), {
  leftActionPanel: () => appLeftActionPanel,
  rightActionPanel: undefined,
  mainAction: undefined,
  noTop: false,
});

defineEmits<{
  'panel-closed': ['left' | 'right']
}>();

const actionBarRef = useTemplateRef<InstanceType<typeof ActionBar>>('actionBarRef');

let layoutKeydownHandle: KeyboardLayerHandle | null = null;

/**
 * priority 低于 ActionPanel/结果列表层：栈顶未消费时再处理 ↵ 与 ⌘K/Ctrl+K。
 * @returns 是否已消费该 keydown
 */
const layoutKeydownHandler = (e: KeyboardEvent) => {
  if (e.isComposing) return false;

  /** macOS：⌘K；Windows / Linux：Ctrl+K */
  if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !(e.metaKey && e.ctrlKey) && !e.altKey && !e.shiftKey && !e.repeat) {
    if (!props.rightActionPanel?.actions?.length) return false;
    actionBarRef.value?.toggleRightPanel();
    return true;
  }

  /** 无修饰键 Enter → mainAction（与 ActionBar ↵ 一致） */
  if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && !e.repeat) {
    const t = e.target;
    if (t instanceof HTMLElement) {
      if (t.closest('textarea')) return false;
      if (t.isContentEditable) return false;
    }
    const run = props.mainAction?.action;
    if (!run) return false;
    run();
    return true;
  }

  return false;
};

onPageEnter(() => {
  layoutKeydownHandle?.dispose();
  layoutKeydownHandle = registerKeyboardLayer({
    id: 'public-layout-chrome',
    priority: KEYBOARD_LAYER_PRIORITY_PUBLIC_LAYOUT,
    handler: layoutKeydownHandler,
  });
});
onPageLeave(() => {
  layoutKeydownHandle?.dispose();
  layoutKeydownHandle = null;
});
</script>

<style lang="scss" scoped>
/*
 * 布局结构：top(导航/搜索栏) + content(内容区) + bottom(ActionBar)
 *
 * CSS 变量定义（见 App.vue）：
 *   --page-height: 页面高度 (578px)
 *   --nav-height: 顶部区域高度 (48px)
 *   --action-bar-height: 底部 ActionBar 高度 (42px)
 *   --divider-color: 分割线颜色
 */
.public-layout {
  display: flex;
  flex-direction: column;
  height: var(--page-height);
  padding-bottom: var(--action-bar-height);
  box-sizing: border-box;
  overflow: auto;
}
.layout-top {
  flex-shrink: 0;
  height: var(--nav-height);
}
.layout-divider {
  flex-shrink: 0;
  height: 1px;
  background-color: var(--divider-color);
}
.layout-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
