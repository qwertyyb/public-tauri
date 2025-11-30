<template>
  <div
    class="public-list-item"
    :class="{selected}"
    :data-result-item-index="index"
    @click="$emit('select')"
    @dblclick="$emit('enter')"
  >
    <div
      v-if="icon"
      class="item-image-wrapper"
    >
      <img
        :src="icon"
        alt=""
        loading="lazy"
      >
    </div>
    <div class="item-info">
      <h3
        class="item-title"
      >
        {{ title }}
      </h3>
      <h5
        v-if="subtitle"
        class="item-subtitle"
      >
        {{ subtitle }}
      </h5>
    </div>
    <!-- <div class="item-actions">
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
    </div> -->
  </div>
</template>

<script setup lang="ts">
// import ShortcutsKey from '@/components/ShortcutsKey.vue';
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
.public-list-item {
  scroll-snap-align: start;
  display: flex;
  align-items: center;
  height: 54px;
  max-width: 100%;
  content-visibility: auto;
  contain-intrinsic-size: 54px;
  transition: all .1s;
  padding: 0 16px;
  box-sizing: border-box;
  position: relative;
  cursor: pointer;
  :deep(mark) {
    background: none;
    color: rgb(251, 163, 0);
  }
  &:hover {
    background-color: light-dark(rgba(0, 0, 0, 0.1), rgba(184, 184, 184, 0.2));
  }
  &.selected {
    background-color: light-dark(rgba(0, 0, 0, 0.15), rgba(184, 184, 184, 0.3));
  }
}
.item-image-wrapper {
  width: 36px;
  height: 36px;
  margin-right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  img {
    width: 100%;
    height: 100%;
  }
}
.item-info {
  width: 0;
  /* max-width: calc(100% - 90px); */
  flex: 1;
}
.item-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-subtitle {
  font-size: 12px;
  font-weight: normal;
  opacity: 0.7;
  height: 16px;
  white-space: pre;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-actions {
  display: flex;
  align-items: center;
}
</style>
