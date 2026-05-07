import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast } from '@raycast/api';
import { useMemo, useState } from 'react';

type Preferences = { message?: string };

type FormValues = {
  title: string;
  password: string;
  description: string;
  enabled: boolean;
  dueDate: Date | null;
  category: string;
  tags: string[];
  files: string[];
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [values, setValues] = useState<FormValues>({
    title: '',
    password: '',
    description: preferences.message || '',
    enabled: true,
    dueDate: null,
    category: 'feature',
    tags: ['blue'],
    files: [],
  });

  const preview = useMemo(() => JSON.stringify({
    ...values,
    dueDate: values.dueDate ? values.dueDate.toISOString() : null,
  }, null, 2), [values]);

  return (
    <Form
      navigationTitle="Worker-rendered Form"
      actions={(
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Form"
            onSubmit={() => {
              void showToast({
                style: Toast.Style.Success,
                title: 'Form submitted',
                message: `Category: ${values.category}`,
              });
            }}
          />
          <Action
            title="Preview Values"
            onAction={() => {
              void showToast({
                style: Toast.Style.Animated,
                title: 'Current values',
                message: values.title || '(empty title)',
              });
            }}
          />
        </ActionPanel>
      )}
    >
      <Form.Description text="Raycast Form compatibility fixture in Worker view mode." />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Input title"
        value={values.title}
        onChange={value => setValues(prev => ({ ...prev, title: value }))}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Input password"
        value={values.password}
        onChange={value => setValues(prev => ({ ...prev, password: value }))}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Input description"
        enableMarkdown
        value={values.description}
        onChange={value => setValues(prev => ({ ...prev, description: value }))}
      />
      <Form.Separator />
      <Form.Checkbox
        id="enabled"
        label="Enable this option"
        value={values.enabled}
        onChange={value => setValues(prev => ({ ...prev, enabled: value }))}
      />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        value={values.dueDate ?? undefined}
        onChange={value => setValues(prev => ({ ...prev, dueDate: value }))}
      />
      <Form.Dropdown
        id="category"
        title="Category"
        value={values.category}
        onChange={value => setValues(prev => ({ ...prev, category: value }))}
      >
        <Form.Dropdown.Section title="Common">
          <Form.Dropdown.Item
            value="feature"
            title="Feature"
            icon="star"
            keywords={['roadmap', 'new']}
            shortcut={{ modifiers: ['cmd'], key: '1' }}
          />
          <Form.Dropdown.Item
            value="bugfix"
            title="Bugfix"
            icon="bug"
            keywords={['issue', 'patch']}
            shortcut={{ modifiers: ['cmd'], key: '2' }}
          />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Other">
          <Form.Dropdown.Item value="chore" title="Chore" />
          <Form.Dropdown.Item value="docs" title="Docs" />
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.TagPicker
        id="tags"
        title="Tags"
        value={values.tags}
        onChange={value => setValues(prev => ({ ...prev, tags: value }))}
      >
        <Form.TagPicker.Item value="blue" title="Blue" />
        <Form.TagPicker.Item value="green" title="Green" />
        <Form.TagPicker.Item value="red" title="Red" />
      </Form.TagPicker>
      <Form.FilePicker
        id="files"
        title="Files"
        value={values.files}
        onChange={value => setValues(prev => ({ ...prev, files: value }))}
      />
      <Form.Description text={`Preview:\n${preview}`} />
    </Form>
  );
}
