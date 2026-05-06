/**
 * Raycast {@link Form} 兼容实现（view 模式）。
 * @see https://developers.raycast.com/api-reference/user-interface/form
 */
import React from 'react';
import type { KeyboardShortcut, RaycastImageLike } from './Action';

export type FormProps = {
  actions?: React.ReactNode;
  children?: React.ReactNode;
  isLoading?: boolean;
  navigationTitle?: string;
};

export type FormDescriptionProps = {
  children?: React.ReactNode;
  text?: string;
};

export type FormSeparatorProps = Record<string, never>;

export type FormTextFieldProps = {
  id: string;
  title?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  info?: string;
  error?: string;
  onChange?: (value: string) => void;
};

export type FormPasswordFieldProps = FormTextFieldProps;

export type FormTextAreaProps = {
  id: string;
  title?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  info?: string;
  error?: string;
  enableMarkdown?: boolean;
  onChange?: (value: string) => void;
};

export type FormCheckboxProps = {
  id: string;
  label?: string;
  title?: string;
  value?: boolean;
  defaultValue?: boolean;
  info?: string;
  onChange?: (value: boolean) => void;
};

export type FormDatePickerProps = {
  id: string;
  title?: string;
  value?: Date;
  defaultValue?: Date;
  onChange?: (value: Date | null) => void;
};

export type FormDropdownProps = {
  id: string;
  title?: string;
  defaultValue?: string;
  value?: string;
  info?: string;
  error?: string;
  storeValue?: boolean;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
};

export type FormDropdownSectionProps = {
  title?: string;
  children?: React.ReactNode;
};

export type FormDropdownItemProps = {
  value: string;
  title: string;
  icon?: RaycastImageLike;
  keywords?: string[];
  shortcut?: KeyboardShortcut;
};

function FormImpl(props: FormProps) {
  const { children, ...rest } = props;
  return React.createElement('raycast:form', rest, children);
}

function FormDescription(props: FormDescriptionProps) {
  const text = props.text ?? (typeof props.children === 'string' ? props.children : undefined);
  return React.createElement('raycast:form-description', { text });
}

function FormSeparator(_props: FormSeparatorProps) {
  return React.createElement('raycast:form-separator', {});
}

function FormTextField(props: FormTextFieldProps) {
  return React.createElement('raycast:form-text-field', props);
}

function FormPasswordField(props: FormPasswordFieldProps) {
  return React.createElement('raycast:form-password-field', props);
}

function FormTextArea(props: FormTextAreaProps) {
  return React.createElement('raycast:form-text-area', props);
}

function FormCheckbox(props: FormCheckboxProps) {
  return React.createElement('raycast:form-checkbox', props);
}

function FormDatePicker(props: FormDatePickerProps) {
  const serializedProps = {
    ...props,
    value: props.value instanceof Date ? props.value.toISOString() : props.value,
    defaultValue: props.defaultValue instanceof Date ? props.defaultValue.toISOString() : props.defaultValue,
  };
  return React.createElement('raycast:form-date-picker', serializedProps);
}

function FormDropdown(props: FormDropdownProps) {
  const { children, ...rest } = props;
  return React.createElement('raycast:form-dropdown', rest, children);
}

function FormDropdownSection(props: FormDropdownSectionProps) {
  const { children, ...rest } = props;
  return React.createElement('raycast:form-dropdown-section', rest, ...(React.Children.toArray(children)));
}

function FormDropdownItem(props: FormDropdownItemProps) {
  return React.createElement('raycast:form-dropdown-item', props);
}

const FormDropdownComp = Object.assign(FormDropdown, {
  Section: FormDropdownSection,
  Item: FormDropdownItem,
});

/** @see https://developers.raycast.com/api-reference/user-interface/form */
export const Form = Object.assign(FormImpl, {
  Description: FormDescription,
  Separator: FormSeparator,
  TextField: FormTextField,
  PasswordField: FormPasswordField,
  TextArea: FormTextArea,
  Checkbox: FormCheckbox,
  DatePicker: FormDatePicker,
  Dropdown: FormDropdownComp,
});
