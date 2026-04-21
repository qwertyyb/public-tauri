<template>
  <div class="action-panel-container">
    <div
      ref="trigger"
      class="action-bar-action"
      :class="{ active: visible }"
      @click="handleToggle"
    >
      <slot name="trigger" />
    </div>
    <div
      ref="panelRef"
      class="action-panel"
      :class="[position, { visible }]"
    >
      <div
        v-if="title"
        class="menu-header"
      >
        {{ title }}
      </div>
      <ul class="menu-list">
        <li
          v-for="(item, index) in actions"
          :key="index"
          class="menu-item"
          :class="item.styleType"
          @click="handleClick(item)"
        >
          <AppIcon
            :icon="item.icon"
            :size="18"
            class="menu-item-icon"
          />
          <span class="menu-item-label">{{ item.title || item.name }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { EVENT_NAME } from '@/const';
import AppIcon from '@public/icon/AppIcon.vue';

export interface Action {
  name: string;
  icon?: string;
  title?: string;
  styleType?: 'default' | 'warning' | 'danger';
  action?: () => void;
}

const props = defineProps<{
  position: 'left' | 'right';
  title?: string;
  actions: Action[];
  visible: boolean;
}>();

const triggerRef = useTemplateRef<HTMLElement>('trigger');

const emit = defineEmits<{
  toggle: [];
  close: [];
}>();

const panelRef = useTemplateRef<HTMLElement>('panelRef');
let stopClickOutside: (() => void) | null = null;

watch(
  () => props.visible,
  (val) => {
    stopClickOutside?.();
    stopClickOutside = null;

    if (val && panelRef.value && triggerRef.value) {
      stopClickOutside = onClickOutside(panelRef.value, () => emit('close'), {
        ignore: [triggerRef.value],
      });
    }
  },
);

const handleToggle = () => {
  if (props.visible) {
    emit('close');
  } else {
    emit('toggle');
  }
};

const handleBlur = () => {
  if (props.visible) {
    // 这种场景下，动画会有残留，直接先把 ActionPanel 隐藏掉
    panelRef.value && (panelRef.value.style.display = 'none');
    emit('close');
    setTimeout(() => {
      panelRef.value?.style.removeProperty('display');
    }, 150);
  }
};

onMounted(() => {
  document.addEventListener(EVENT_NAME.BLURRED, handleBlur);
});

onBeforeUnmount(() => {
  stopClickOutside?.();
  document.removeEventListener(EVENT_NAME.BLURRED, handleBlur);
});

const handleClick = (item: Action) => {
  item.action?.();
  emit('close');
};
</script>

<style lang="scss" scoped>
.action-panel-container {
  display: contents;
  * {
    user-select: none;
    -webkit-user-select: none;
  }
}

.action-bar-action {
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  &:hover, &.active {
    background-color: light-dark(rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.08));
  }
}

.action-panel {
  position: fixed;
  bottom: calc(var(--action-bar-height) + 8px);
  width: 200px;
  background-color: light-dark(rgba(255, 255, 255, 0.7), rgba(39, 40, 50, 0.85));
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: var(--action-panel-shadow);
  color: light-dark(#333, #ddd);
  padding: 8px;
  z-index: 100;
  visibility: hidden;
  opacity: 0;
  transform: translateY(8px);
  transition: visibility 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
  &.left {
    left: 8px;
  }
  &.right {
    right: 8px;
  }
  &.visible {
    visibility: visible;
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-header {
  font-size: 12px;
  opacity: 0.6;
  padding: 4px 8px;
}

.menu-list {
  .menu-item {
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.05s ease;
    font-size: 14px;
    display: flex;
    align-items: center;
    &:hover {
      background-color: light-dark(rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.08));
    }
    &.warning {
      color: #d97706;
    }
    &.danger {
      color: #e53e3e;
    }
    .menu-item-icon {
      margin-right: 8px;
      font-size: 18px;
    }
  }
}
</style>
