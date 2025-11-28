<template>
  <el-collapse
    class="collapsed-container"
    :class="{ collapsed }"
    :expand-icon-position="expandIconPosition"
  >
    <el-collapse-item
      :title="title"
      name="index"
    >
      <template #title>
        <slot name="title">
          {{ title }}
        </slot>
      </template>
      <div
        class="collapsed-content"
      >
        <slot />
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<script lang="ts" setup>
import { ElCollapse, ElCollapseItem } from 'element-plus';
import { ref } from 'vue';

defineProps<{ title?: string, expandIconPosition?: 'left' | 'right' }>();

const collapsed = ref(true);
</script>

<style lang="scss" scoped>
.collapsed-container {
  --el-collapse-header-bg-color: transparent;
  --el-collapse-border-color: transparent;
  --el-collapse-content-bg-color: light-dark(rgba(255, 255, 255, 0.2), rgba(255, 255, 255, .1));
  border-radius: 6px;
  overflow: hidden;
  background: light-dark(rgba(225, 225, 225, 0.2), rgba(255, 255, 255, .1));
  :deep(.el-collapse-item__header) {
    padding-left: 12px;
  }
}
.collapsed-content {
  transition: max-height .2s;
  max-height: 600px;
  padding: 12px;
}
</style>
