<template>
  <div
    class="collapsed-container"
    :class="{ collapsed }"
  >
    <div
      class="collapsed-title"
      @click="collapsed = !collapsed"
    >
      {{ title }}
      <ElIcon
        class="arrow-icon"
        size="14"
      >
        <ArrowRightBold />
      </ElIcon>
    </div>
    <div
      class="collapsed-content"
    >
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ElIcon } from 'element-plus';
import { ArrowRightBold } from '@element-plus/icons-vue';
import { ref } from 'vue';

defineProps<{ title: string }>();

const collapsed = ref(true);
</script>

<style lang="scss" scoped>
.collapsed-container {
  padding: 12px;
  border: 1px solid light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.1));
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}
.collapsed-title {
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.arrow-icon {
  transition: transform .2s;
  margin-left: 8px;
}
.collapsed-content {
  transition: max-height .2s;
  max-height: 600px;
}
.collapsed {
  .arrow-icon {
    transform: rotate(90deg);
  }
  .collapsed-content{
    max-height: 60px;
    overflow: auto;
    height: 60px;
    margin: 0 -12px;
    padding: 0 12px;
    &::after {
      content: " ";
      display: block;
      width: 100%;
      height: 50%;
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(to top, light-dark(#787878, #333), transparent);
      z-index: 1;
      pointer-events: none;
    }
  }
}
</style>
