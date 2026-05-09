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
