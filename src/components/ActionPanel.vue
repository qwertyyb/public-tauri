<template>
  <div
    class="action-panel-container"
    :class="position"
  >
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
      tabindex="-1"
      class="action-panel"
      :class="{ visible }"
      role="menu"
      :aria-hidden="!visible"
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
          :class="[item.styleType, { 'keyboard-selected': visible && selectedIndex === index }]"
          role="menuitem"
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
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { EVENT_NAME } from '@/const';
import AppIcon from '@public-tauri/icon/AppIcon.vue';
import {
  KEYBOARD_LAYER_PRIORITY_ACTION_PANEL,
  type KeyboardLayerHandle,
  registerKeyboardLayer,
} from '@/keyboard/keyboardLayer';
import { isKeyPressed } from '@/utils/keyboard';

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
const selectedIndex = ref(0);
let stopClickOutside: (() => void) | null = null;

let layerHandle: KeyboardLayerHandle | null = null;

const syncLayerEnabled = () => {
  layerHandle?.setEnabled(props.visible && props.actions.length > 0);
};

const panelKeyboardHandler = (e: KeyboardEvent) => {
  if (e.isComposing) return false;
  if (!props.visible || props.actions.length === 0) return false;

  if (isKeyPressed(e, 'Escape')) {
    emit('close');
    return true;
  }

  if (isKeyPressed(e, 'ArrowUp')) {
    selectedIndex.value = Math.max(0, selectedIndex.value - 1);
    return true;
  }

  if (isKeyPressed(e, 'ArrowDown')) {
    selectedIndex.value = Math.min(props.actions.length - 1, selectedIndex.value + 1);
    return true;
  }

  if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && !e.repeat) {
    const item = props.actions[selectedIndex.value];
    item?.action?.();
    emit('close');
    return true;
  }

  return false;
};

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

    if (val) selectedIndex.value = 0;
    syncLayerEnabled();
  },
);

watch(
  () => props.actions.length,
  () => {
    if (selectedIndex.value >= props.actions.length) {
      selectedIndex.value = Math.max(0, props.actions.length - 1);
    }
    syncLayerEnabled();
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
    panelRef.value?.style.setProperty('display', 'none');
    emit('close');
    setTimeout(() => {
      panelRef.value?.style.removeProperty('display');
    }, 150);
  }
};

onMounted(() => {
  document.addEventListener(EVENT_NAME.BLURRED, handleBlur);
  layerHandle = registerKeyboardLayer({
    id: `action-panel-${props.position}`,
    priority: KEYBOARD_LAYER_PRIORITY_ACTION_PANEL,
    enabled: false,
    handler: panelKeyboardHandler,
    activated: () => {
      selectedIndex.value = 0;
      nextTick(() => panelRef.value?.focus());
    },
  });
  syncLayerEnabled();
});

onBeforeUnmount(() => {
  stopClickOutside?.();
  document.removeEventListener(EVENT_NAME.BLURRED, handleBlur);
  layerHandle?.dispose();
  layerHandle = null;
});

const handleClick = (item: Action) => {
  item.action?.();
  emit('close');
};
</script>

<style lang="scss" scoped>
.action-panel-container {
  display: contents;
  &.left {
    .action-panel {
      left: 8px;
    }
    .action-bar-action{
      color: var(--text-primary-color);
    }
  }
  &.right .action-panel {
    right: 8px;
  }
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
    background: var(--ui-bg-accented);
  }
}

.action-panel {
  position: fixed;
  bottom: calc(var(--action-bar-height) + 8px);
  width: 200px;
  background-color: var(--ui-bg-elevated);
  backdrop-filter: blur(24px);
  border-radius: 8px;
  box-shadow: var(--action-panel-shadow);
  padding: 8px;
  z-index: 100;
  visibility: hidden;
  opacity: 0;
  transform: translateY(8px);
  transition: visibility 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
  outline: none;
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
      background: var(--ui-bg-accented);
    }
    &.warning {
      color: var(--ui-warning);
    }
    &.danger {
      color: var(--ui-error);
    }
    .menu-item-icon {
      margin-right: 8px;
      font-size: 18px;
    }
  }
}
</style>
