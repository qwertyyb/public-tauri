import type { ConvertWarning, RaycastPreference } from './types';

const mapPreferenceType = (type: string | undefined, warnings: ConvertWarning[]) => {
  switch (type) {
    case 'password':
      return 'password';
    case 'textarea':
      return 'textarea';
    case 'dropdown':
      return 'select';
    case 'checkbox':
      return 'select';
    case 'textfield':
    case 'appPicker':
    case undefined:
      return 'text';
    default:
      warnings.push({ type: 'preference', message: `Unsupported preference type "${type}", converted to text` });
      return 'text';
  }
};

export const convertPreference = (preference: RaycastPreference, warnings: ConvertWarning[]) => {
  const type = mapPreferenceType(preference.type, warnings);
  const options = preference.type === 'checkbox'
    ? [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ]
    : preference.data?.map(item => ({
      label: item.title || item.label || String(item.value),
      value: item.value,
    }));
  return {
    name: preference.name,
    title: preference.title || preference.label || preference.name,
    description: preference.description,
    type,
    required: Boolean(preference.required),
    placeholder: preference.placeholder,
    defaultValue: preference.defaultValue ?? preference.default,
    ...(options?.length ? { options } : {}),
  };
};

export const mergePreferences = (
  pluginPreferences: RaycastPreference[],
  commandPreferences: RaycastPreference[],
  warnings: ConvertWarning[],
) => {
  const preferenceNames = new Set<string>();
  return [...pluginPreferences, ...commandPreferences]
    .map(preference => convertPreference(preference, warnings))
    .filter((preference) => {
      if (preferenceNames.has(preference.name)) {
        warnings.push({ type: 'preference', message: `Duplicate preference "${preference.name}" was skipped` });
        return false;
      }
      preferenceNames.add(preference.name);
      return true;
    });
};
