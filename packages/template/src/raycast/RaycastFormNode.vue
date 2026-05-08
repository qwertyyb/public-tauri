<script setup lang="ts">
import type { SerializedHostNode } from './types';
import RaycastFormDescription from './form/RaycastFormDescription.vue';
import RaycastFormSeparator from './form/RaycastFormSeparator.vue';
import RaycastFormTextField from './form/RaycastFormTextField.vue';
import RaycastFormPasswordField from './form/RaycastFormPasswordField.vue';
import RaycastFormTextArea from './form/RaycastFormTextArea.vue';
import RaycastFormCheckbox from './form/RaycastFormCheckbox.vue';
import RaycastFormDatePicker from './form/RaycastFormDatePicker.vue';
import RaycastFormDropdown from './form/RaycastFormDropdown.vue';
import RaycastFormTagPicker from './form/RaycastFormTagPicker.vue';
import RaycastFormFilePicker from './form/RaycastFormFilePicker.vue';
import RaycastFormNode from './RaycastFormNode.vue';

defineProps<{
  node: SerializedHostNode;
  getStoredValue?:(_id: string) => unknown;
  onFieldValueChange?:(_node: SerializedHostNode, _value: unknown) => void;
}>();

const componentMap: Record<string, any> = {
  'raycast:form-description': RaycastFormDescription,
  'raycast:form-separator': RaycastFormSeparator,
  'raycast:form-text-field': RaycastFormTextField,
  'raycast:form-password-field': RaycastFormPasswordField,
  'raycast:form-text-area': RaycastFormTextArea,
  'raycast:form-checkbox': RaycastFormCheckbox,
  'raycast:form-date-picker': RaycastFormDatePicker,
  'raycast:form-dropdown': RaycastFormDropdown,
  'raycast:form-tag-picker': RaycastFormTagPicker,
  'raycast:form-file-picker': RaycastFormFilePicker,
};
</script>

<template>
  <component
    :is="componentMap[node.type]"
    v-if="componentMap[node.type]"
    v-bind="node.props"
    :children="node.children"
    :get-stored-value="getStoredValue"
    :on-field-value-change="(value: unknown) => onFieldValueChange?.(node, value)"
  />
  <template v-else>
    <RaycastFormNode
      v-for="ch in node.children"
      :key="ch.hostId"
      :node="ch"
      :get-stored-value="getStoredValue"
      :on-field-value-change="onFieldValueChange"
    />
  </template>
</template>

<style>
.rv-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rv-form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--rv-text);
}

.rv-form-input,
.rv-form-textarea,
.rv-form-select {
  width: 100%;
  border: 1px solid var(--rv-border);
  border-radius: 10px;
  background: var(--rv-surface-elevated, var(--rv-surface));
  color: var(--rv-text);
  font: inherit;
  font-size: 13px;
  padding: 8px 10px;
}

.rv-form-textarea {
  min-height: 96px;
  resize: vertical;
}

.rv-form-help {
  font-size: 11px;
  color: var(--rv-text-secondary);
}

.rv-form-help-error {
  color: #ff6b6b;
}

.rv-form-markdown-preview {
  border: 1px solid var(--rv-border);
  border-radius: 10px;
  background: var(--rv-surface);
  padding: 10px;
  font-size: 12px;
  color: var(--rv-text-secondary);
}

.rv-form-markdown-preview :deep(p) {
  margin: 0.35em 0;
}

.rv-form-markdown-preview :deep(pre) {
  margin: 0.35em 0;
  overflow: auto;
}

.rv-form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--rv-text);
  font-size: 13px;
}
</style>
