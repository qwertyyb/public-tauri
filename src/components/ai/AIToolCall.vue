<template>
  <CollapsedContainer
    class="tool-call-container"
    expand-icon-position="left"
    :class="status"
  >
    <template #title>
      <div class="tool-call-header">
        <div class="tool-call-header-left">
          工具调用: {{ tool.name }}
        </div>
        <div class="tool-call-header-right">
          {{ ToolCallStatusLabel[status || 'waiting'] }}
        </div>
      </div>
    </template>
    <p class="tool-call-arguments">
      参数: {{ tool.arguments }}
    </p>

    <p class="tool-call-status">
      状态: {{ ToolCallStatusLabel[status || 'waiting'] }}
    </p>

    <p
      v-if="status === 'success' || status === 'error'"
      class="tool-call-result"
    >
      {{ status === 'success' ? '结果' : '错误信息' }}: {{ result }}
    </p>
  </CollapsedContainer>
</template>

<script setup lang="ts">
import CollapsedContainer from '@/components/CollapsedContainer.vue';
import { type ToolCallStatus, ToolCallStatusLabel } from './const';


defineProps<{
  tool: { name: string, arguments: string }
  status?: ToolCallStatus,
  result?: string
}>();
</script>

<style lang="scss" scoped>
.tool-call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 12px;
}
.waiting {
  --status-icon-color: #ffc107;
}
.running {
  --status-icon-color: #007bff;
}
.success {
  --status-icon-color: #28a745;
}
.error {
  --status-icon-color: #dc3545;
}
.tool-call-header-right {
  display: flex;
  align-items: center;
  &::after {
    content: " ";
    display: block;
    width: 6px;
    height: 6px;
    margin-left: 8px;
    border-radius: 50%;
    background: var(--status-icon-color);
  }
}
</style>
