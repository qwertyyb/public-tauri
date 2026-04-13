import * as z from 'zod';

export const preferenceSchema = z.object({
  name: z.string('偏好名称'),
  title: z.string('偏好标题，外显给用户').optional(),
  description: z.string('它可以帮助用户了解偏好设置的作用。会显示在输入框下方').optional(),
  type: z.enum(['text', 'number', 'textarea', 'password', 'select'], '表单类型').default('text'),
  required: z.boolean('指示该值是否是必需的，并且必须由用户输入该值才能使用该扩展').default(false),
  placeholder: z.string('输入框的占位符').optional(),
  defaultValue: z.any(),
  options: z.array(z.object({
    label: z.string('选项名称'),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }), '选项列表').optional(),
}, '偏好设置')
  .refine((data) => {
    if (data?.type === 'select' && (data.options?.length ?? 0) < 1) {
      return false;
    }
    return true;
  }, {
    message: 'options is required when type is select',
    path: ['options'],
  });

export type IPreference = z.infer<typeof preferenceSchema>;

export type IPreferences = IPreference[];

