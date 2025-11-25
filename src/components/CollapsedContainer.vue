<template>
  <el-collapse
    class="collapsed-container"
    :class="{ collapsed }"
  >
    <el-collapse-item
      :title="title"
      name="index"
    >
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

defineProps<{ title: string }>();

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
