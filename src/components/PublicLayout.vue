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
      :left-action-panel="leftActionPanel"
      :right-action-panel="rightActionPanel"
      :main-action="mainAction"
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
import { onPageEnter, onPageLeave } from '@/router';

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

/** 仅无修饰键的 Enter：与 ActionBar ↵ 一致，统一触发 mainAction（含 wujie 子应用经 manager 转发的合成事件） */
const onMainActionKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Enter') return;
  if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.repeat) return;
  const t = e.target;
  if (t instanceof HTMLElement) {
    if (t.closest('textarea')) return;
    if (t.isContentEditable) return;
  }
  const run = props.mainAction?.action;
  if (!run) return;
  e.preventDefault();
  e.stopPropagation();
  run();
};

onPageEnter(() => {
  window.addEventListener('keydown', onMainActionKeydown, true);
});
onPageLeave(() => {
  window.removeEventListener('keydown', onMainActionKeydown, true);
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
