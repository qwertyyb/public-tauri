import * as z from 'zod'

const preferencesSchema = z.object({
  name: z.string('偏好名称'),
  title: z.string('偏好标题，外显给用户').optional(),
  description: z.string('它可以帮助用户了解偏好设置的作用。会显示在输入框下方').optional(),
  type: z.enum(['text', 'number', 'textarea', 'password', 'select'], '表单类型').default('text'),
  required: z.boolean('指示该值是否是必需的，并且必须由用户输入该值才能使用该扩展').default(false),
  placeholder: z.string('输入框的占位符').optional(),
  defaultValue: z.any(),
  options: z.array(z.object({
    label: z.string('选项名称'),
    value: z.union([z.string(), z.number(), z.boolean()])
  }), '选项列表').optional()
}, '偏好设置')
  .optional()
  .refine(data => {
    if (data?.type === 'select' && (data.options?.length ?? 0) < 1) {
      return false
    }
    return true
  }, {
    message: 'options is required when type is select',
    path: ['options']
  })

const commandSchema = z.object({
  name: z.string('插件内命令的唯一名称'),
  title: z.string('命令标题，用于在应用商店中显示和在偏好设置中显示').max(60),
  subtitle: z.string('命令副标题，用于在应用商店中显示和在偏好设置中显示').max(100).optional(),
  description: z.string('命令描述，用于在应用商店中显示和在偏好设置中显示').optional(),
  icon: z.string('命令的图标，如果不填写，则默认使用外层的 icon 字段').optional(),
  mode: z.enum(['listView', 'none', 'view'], '命令类型, template 为 listView 时，只能为 listView 或 none').default('none')
})

const schema = z.object({
  $schema: z.string().optional(),
  name: z.string('插件的唯一名字，请保持名称简短并与 URL 兼容'),
  title: z.string('插件标题，标题会在应用商店中以及偏好设置中显示给用户。请使用此标题来清晰地描述您的插件，以便用户能够在应用商店中找到它').max(60),
  subtitle: z.string('插件的简短描述，用于快速说明插件的功能').max(100).optional(),
  description: z.string('对插件的完整描述，将会在应用商店中显示给用户').optional(),
  icon: z.string('引用 assets 文件夹中的图标文件。请使用 png 格式，尺寸为 512 x 512 像素。为了支持明暗主题，请添加两个图标，其中一个带有@dark后缀，例如icon.png和icon@dark.png'),
  main: z.string('入口 Javascript 文件路径，此文件会在首页执行').optional(),
  server: z.string('服务端 Javascript 文件路径，此文件会在服务端运行').optional(),
  template: z.enum(['listView'], '模板，目前仅支持 listView').optional(),
  html: z.string('HTML 入口文件路径').optional(),
  preferences: z.array(preferencesSchema, '插件的偏好设置').optional(),
  commands: z.array(commandSchema, '插件支持的命令列表').optional()
})
  .superRefine((data, ctx) => {
    // template、main、html 三选一
    const { template, main, html, commands } = data
    const t = template ? 1 : 0
    const m = main ? 1 : 0
    const h = html ? 1 : 0
    if (t + m + h !== 1) {
      ctx.addIssue({
        code: "custom",
        message: 'template、main、html 只能填写一个',
        values: [template, main, html]
      })
      return;
    }
    // 如果没有 commands，则必须要有 main 字段
    if (!commands?.length && !main) {
      ctx.addIssue({
        code: 'custom',
        message: 'commands字段不能都为空',
      })
    }
    // 如果 template 是 listView，则 command.mode 只能为 noView 或 listView
    if (template === 'listView') {
      commands?.forEach((command, index) => {
        if (!['listView', 'none'].includes(command.mode)) {
          ctx.addIssue({
            code: 'invalid_value',
            message: 'template 为 listView 时，mode 必须为 none 或 listView',
            values: [command.mode],
            input: command.mode,
            path: ['commands', index, 'mode']
          })
        }
      })
    }

    // 如果 html 有值，则 command.mode 只能为 view 或 noView
    if (html) {
      commands?.forEach((command, index) => {
        if (!['view', 'none'].includes(command.mode)) {
          ctx.addIssue({
            code: 'invalid_value',
            message: 'mode 必须为 none 或 view',
            values: [command.mode],
            input: command.mode,
            path: ['commands', index, 'mode']
          })
        }
      })
    }
  })

export type IPluginManifest = z.infer<typeof schema>

export const parse = (json: any) => {
  return schema.parse(json)
}

export const toJSONSchema = () => {
  return z.toJSONSchema(schema)
}
