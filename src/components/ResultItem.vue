<!-- eslint-disable vue/no-v-html -->
<template>
  <div
    class="resultItem result-item"
    :class="{selected}"
    :data-result-item-index="index"
    @click="$emit('select')"
    @dblclick="$emit('enter')"
  >
    <AppIcon
      v-if="icon"
      :icon="icon"
      :size="36"
      class="item-image"
    />
    <div class="itemInfo flex-1 flex-col-center">
      <h3
        class="itemTitle text-single-line"
        v-html="title"
      />
      <h5
        v-if="subtitle"
        class="itemSubtitle color-666 text-sm text-single-line"
        v-html="subtitle"
      />
    </div>
    <div class="actions cursor-pointer">
      <ShortcutsKey
        v-if="selected"
        shortcuts="Enter"
        @click="$emit('enter')"
      />
      <ShortcutsKey
        v-else-if="actionKey"
        :shortcuts="['Meta', actionKey]"
        @click="$emit('enter')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ShortcutsKey from '@/components/ShortcutsKey.vue';
import { AppIcon } from '@public/icon';
interface IResultItem {
  icon?: string,
  title: string,
  subtitle?: string,
}

interface IResultItemProps extends IResultItem {
  index?: number,
  selected?: boolean,
  actionKey?: string,
}

defineProps<IResultItemProps>();

defineEmits<{
  select: [],
  enter: []
}>();

</script>

<style lang="scss" scoped>
.resultItem {
  scroll-snap-align: start;
  display: flex;
  align-items: center;
  height: var(--item-height);
  max-width: 100%;
  content-visibility: auto;
  contain-intrinsic-size: var(--item-height);
  transition: all .1s;
  padding: 0 16px;
  box-sizing: border-box;
  position: relative;
  cursor: pointer;
  :deep(mark), :deep(b) {
    background: none;
    color: rgb(251, 163, 0);
  }
}
.resultItem:hover {
  background-color: light-dark(rgba(0, 0, 0, 0.1), rgba(184, 184, 184, 0.2));
}
.resultItem.selected {
  background-color: light-dark(rgba(0, 0, 0, 0.15), rgba(184, 184, 184, 0.3));
}
.item-image {
  width: 36px;
  height: 36px;
  min-width: 36px;
  margin-right: 6px;
}
.itemInfo {
  width: 0;
  /* max-width: calc(100% - 90px); */
  flex: 1;
}
.itemTitle {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
}
.itemSubtitle {
  font-size: 12px;
  font-weight: normal;
  opacity: 0.7;
  height: 16px;
  white-space: pre;
  font-size: 500;
}
.actions {
  display: flex;
  align-items: center;
}
</style>
