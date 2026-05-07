/**
 * Raycast {@link Form} 兼容实现（view 模式）。
 * @see https://developers.raycast.com/api-reference/user-interface/form
 */
import React from 'react';
import type { KeyboardShortcut, RaycastImageLike } from './Action';
import { channel } from '../../node';

export type FormProps = {
  actions?: React.ReactNode;
  children?: React.ReactNode;
  isLoading?: boolean;
  navigationTitle?: string;
};

export type FormEventType = 'focus' | 'blur';
export type FormEvent<T extends FormValue = FormValue> = {
  target: { id: string; value?: T };
  type: FormEventType;
};

export type FormValue = string | number | boolean | Date | null | string[];

export type FormItemRef = {
  focus: () => void
  reset: () => void
};

export type FormItemProps<T extends FormValue> = {
  id: string;
  title?: string;
  info?: string;
  error?: string;
  storeValue?: boolean;
  autoFocus?: boolean;
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  onBlur?: (event: FormEvent<T>) => void;
  onFocus?: (event: FormEvent<T>) => void;
};

export type FormDescriptionProps = {
  children?: React.ReactNode;
  text?: string;
};

export type FormSeparatorProps = Record<string, never>;

type FormHostRefPayload = {
  id: string
  refId: string
  op: 'focus' | 'reset'
  value?: unknown
};

const invokeFormHostRef = (payload: FormHostRefPayload) => {
  void channel.invoke('raycast:view:form-item-ref', payload).catch(() => {});
};

const useFormItemRef = (
  props: { id: string },
  ref: React.ForwardedRef<FormItemRef>,
  getResetValue: () => unknown,
) => {
  const refIdRef = React.useRef(`rf:${Math.random().toString(36).slice(2, 10)}`);
  React.useImperativeHandle(ref, () => ({
    focus: () => invokeFormHostRef({ id: props.id, refId: refIdRef.current, op: 'focus' }),
    reset: () => invokeFormHostRef({
      id: props.id,
      refId: refIdRef.current,
      op: 'reset',
      value: getResetValue(),
    }),
  }), [props.id, getResetValue]);
  return refIdRef.current;
};

type FormTextFieldPropsBase = FormItemProps<string> & {
  placeholder?: string;
};
export type FormTextFieldProps = FormTextFieldPropsBase;

export type FormPasswordFieldProps = FormTextFieldProps;

export type FormTextAreaProps = FormItemProps<string> & {
  placeholder?: string;
  enableMarkdown?: boolean;
};

export type FormCheckboxProps = FormItemProps<boolean> & {
  label?: string;
};

export const FormDatePickerType = {
  DateTime: 'date-time',
  Date: 'date',
} as const;

export type FormDatePickerProps = FormItemProps<Date | null> & {
  type?: (typeof FormDatePickerType)[keyof typeof FormDatePickerType];
  value?: Date;
  defaultValue?: Date;
  onChange?: (value: Date | null) => void;
};

export type FormDropdownProps = FormItemProps<string> & {
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

export type FormTagPickerProps = FormItemProps<string[]> & {
  children?: React.ReactNode;
};

export type FormTagPickerItemProps = {
  value: string;
  title: string;
  icon?: RaycastImageLike;
};

export type FormFilePickerProps = FormItemProps<string[]> & {
  title?: string;
  allowMultipleSelection?: boolean;
  canChooseDirectories?: boolean;
  canChooseFiles?: boolean;
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

const FormTextField = React.forwardRef<FormItemRef, FormTextFieldProps>((props, ref) => {
  const refId = useFormItemRef(props, ref, () => props.defaultValue ?? '');
  return React.createElement('raycast:form-text-field', { ...props, __formRefId: refId });
});

const FormPasswordField = React.forwardRef<FormItemRef, FormPasswordFieldProps>((props, ref) => {
  const refId = useFormItemRef(props, ref, () => props.defaultValue ?? '');
  return React.createElement('raycast:form-password-field', { ...props, __formRefId: refId });
});

const FormTextArea = React.forwardRef<FormItemRef, FormTextAreaProps>((props, ref) => {
  const refId = useFormItemRef(props, ref, () => props.defaultValue ?? '');
  return React.createElement('raycast:form-text-area', { ...props, __formRefId: refId });
});

const FormCheckbox = React.forwardRef<FormItemRef, FormCheckboxProps>((props, ref) => {
  const refId = useFormItemRef(props, ref, () => props.defaultValue ?? false);
  return React.createElement('raycast:form-checkbox', { ...props, __formRefId: refId });
});

const FormDatePicker = React.forwardRef<FormItemRef, FormDatePickerProps>((props, ref) => {
  const refId = useFormItemRef(props, ref, () => (
    props.defaultValue instanceof Date ? props.defaultValue.toISOString() : null
  ));
  const serializedProps = {
    ...props,
    value: props.value instanceof Date ? props.value.toISOString() : props.value,
    defaultValue: props.defaultValue instanceof Date ? props.defaultValue.toISOString() : props.defaultValue,
    __formRefId: refId,
  };
  return React.createElement('raycast:form-date-picker', serializedProps);
});

const FormDropdown = React.forwardRef<FormItemRef, FormDropdownProps>((props, ref) => {
  const refId = useFormItemRef(props, ref, () => props.defaultValue ?? '');
  const { children, ...rest } = props;
  return React.createElement('raycast:form-dropdown', { ...rest, __formRefId: refId }, children);
});

function FormDropdownSection(props: FormDropdownSectionProps) {
  const { children, ...rest } = props;
  return React.createElement('raycast:form-dropdown-section', rest, ...(React.Children.toArray(children)));
}

function FormDropdownItem(props: FormDropdownItemProps) {
  return React.createElement('raycast:form-dropdown-item', props);
}

const FormTagPicker = React.forwardRef<FormItemRef, FormTagPickerProps>((props, ref) => {
  const refId = useFormItemRef(props, ref, () => props.defaultValue ?? []);
  const { children, ...rest } = props;
  return React.createElement('raycast:form-tag-picker', { ...rest, __formRefId: refId }, children);
});

function FormTagPickerItem(props: FormTagPickerItemProps) {
  return React.createElement('raycast:form-tag-picker-item', props);
}

const FormFilePicker = React.forwardRef<FormItemRef, FormFilePickerProps>((props, ref) => {
  const refId = useFormItemRef(props, ref, () => props.defaultValue ?? []);
  return React.createElement('raycast:form-file-picker', { ...props, __formRefId: refId });
});

const FormDropdownComp = Object.assign(FormDropdown, {
  Section: FormDropdownSection,
  Item: FormDropdownItem,
});

const FormTagPickerComp = Object.assign(FormTagPicker, {
  Item: FormTagPickerItem,
});

/** @see https://developers.raycast.com/api-reference/user-interface/form */
export const Form = Object.assign(FormImpl, {
  Event: {
    Type: {
      Focus: 'focus' as FormEventType,
      Blur: 'blur' as FormEventType,
    },
  },
  ItemReference: {} as FormItemRef,
  Description: FormDescription,
  Separator: FormSeparator,
  TextField: FormTextField,
  PasswordField: FormPasswordField,
  TextArea: FormTextArea,
  Checkbox: FormCheckbox,
  DatePicker: Object.assign(FormDatePicker, { Type: FormDatePickerType }),
  Dropdown: FormDropdownComp,
  TagPicker: FormTagPickerComp,
  FilePicker: FormFilePicker,
});
