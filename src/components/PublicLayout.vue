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
import type { ActionPanelAction } from '@/types/plugin';

defineProps<{
  leftActionPanel?: ActionPanel;
  rightActionPanel?: ActionPanel;
  mainAction?: ActionPanelAction;
  noTop?: boolean;
}>();
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
