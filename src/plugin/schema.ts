import * as z from 'zod';

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
    value: z.union([z.string(), z.number(), z.boolean()]),
  }), '选项列表').optional(),
}, '偏好设置')
  .optional()
  .refine((data) => {
    if (data?.type === 'select' && (data.options?.length ?? 0) < 1) {
      return false;
    }
    return true;
  }, {
    message: 'options is required when type is select',
    path: ['options'],
  });

const commandTextMatchSchema = z.object({
  type: z.literal('text'),
  keywords: z.array(z.string(), '关键词列表，用于模糊搜索匹配。用户输入时会与这些关键词进行模糊匹配'),
});

const commandTriggerMatchSchema = z.object({
  type: z.literal('trigger'),
  triggers: z.array(z.string(), '触发器列表，当用户输入以某个触发器开头并加空格时触发匹配'),
  title: z.string('匹配成功后显示的标题，支持 $query 变量，$query 会被替换为触发器后面的查询内容').optional(),
  subtitle: z.string('匹配成功后显示的副标题，支持 $query 变量，$query 会被替换为触发器后面的查询内容').optional(),
});

const commandFullMatchSchema = z.object({
  type: z.literal('full'),
  title: z.string('匹配成功后显示的标题，支持 $query 变量，$query 会被替换为用户的完整输入内容').optional(),
  subtitle: z.string('匹配成功后显示的副标题，支持 $query 变量，$query 会被替换为用户的完整输入内容').optional(),
});

const commandRegexpMatchSchema = z.object({
  type: z.literal('regexp'),
  regexp: z.string('正则表达式，用于匹配用户输入。支持 JavaScript 正则表达式语法'),
  title: z.string('匹配成功后显示的标题，支持模板字符串语法，可以使用正则匹配结果中的捕获组变量，如 ${0}, ${1} 等').optional(),
  subtitle: z.string('匹配成功后显示的副标题，支持模板字符串语法，可以使用正则匹配结果中的捕获组变量，如 ${0}, ${1} 等').optional(),
});

// 文件匹配 schema
const commandFileMatchSchema = z.object({
  type: z.literal('file'),
  extensions: z.array(z.string(), '允许的文件扩展名列表，如 [".jpg", ".png"]').optional(),
  mimeTypes: z.array(z.string(), '允许的 MIME 类型列表，如 ["image/jpeg", "image/png"]').optional(),
  minSize: z.number('文件最小大小限制，单位字节').optional(),
  maxSize: z.number('文件最大大小限制，单位字节').optional(),
  nameRegexp: z.string('文件名匹配的正则表达式').optional(),
  isDirectory: z.boolean('是否只匹配目录').optional(),
  title: z.string('匹配成功后显示的标题').optional(),
  subtitle: z.string('匹配成功后显示的副标题').optional(),
});

const commandMatchSchema = z.union([
  commandTextMatchSchema,
  commandTriggerMatchSchema,
  commandFullMatchSchema,
  commandRegexpMatchSchema,
  commandFileMatchSchema,
]);

const commandSchema = z.object({
  name: z.string('插件内命令的唯一名称'),
  title: z.string('命令标题，用于在应用商店中显示和在偏好设置中显示').max(60),
  subtitle: z.string('命令副标题，用于在应用商店中显示和在偏好设置中显示').max(100)
    .optional(),
  description: z.string('命令描述，用于在应用商店中显示和在偏好设置中显示').optional(),
  icon: z.string('命令的图标，如果不填写，则默认使用外层的 icon 字段').optional(),
  mode: z.enum(['listView', 'none', 'view'], '命令类型, template 为 listView 时，只能为 listView 或 none').default('none'),
  matches: z.array(commandMatchSchema, '命令匹配规则列表，用于定义该命令如何被用户输入触发。支持多种匹配类型：text（关键词）、trigger（触发器）、full（完全匹配）、regexp（正则表达式）、file（文件匹配）').optional(),
});

const schema = z.object({
  $schema: z.string().optional(),
  name: z.string('插件的唯一名字，请保持名称简短并与 URL 兼容'),
  title: z.string('插件标题，标题会在应用商店中以及偏好设置中显示给用户。请使用此标题来清晰地描述您的插件，以便用户能够在应用商店中找到它').max(60),
  subtitle: z.string('插件的简短描述，用于快速说明插件的功能').max(100)
    .optional(),
  description: z.string('对插件的完整描述，将会在应用商店中显示给用户').optional(),
  icon: z.string('引用 assets 文件夹中的图标文件。请使用 png 格式，尺寸为 512 x 512 像素。为了支持明暗主题，请添加两个图标，其中一个带有@dark后缀，例如icon.png和icon@dark.png'),
  main: z.string('入口 Javascript 文件路径，此文件会在首页执行').optional(),
  server: z.string('服务端 Javascript 文件路径，此文件会在服务端运行').optional(),
  template: z.enum(['listView'], '模板，目前仅支持 listView').optional(),
  html: z.string('HTML 入口文件路径').optional(),
  preferences: z.array(preferencesSchema, '插件的偏好设置').optional(),
  commands: z.array(commandSchema, '插件支持的命令列表').optional(),
})
  .superRefine((data, ctx) => {
    // template、main、html 三选一
    const { template, main, html, commands } = data;
    const t = template ? 1 : 0;
    const m = main ? 1 : 0;
    const h = html ? 1 : 0;
    if (t + m + h !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'template、main、html 只能填写一个',
        values: [template, main, html],
      });
      return;
    }
    // 如果没有 commands，则必须要有 main 字段
    if (!commands?.length && !main) {
      ctx.addIssue({
        code: 'custom',
        message: 'commands字段不能都为空',
      });
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
            path: ['commands', index, 'mode'],
          });
        }
      });
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
            path: ['commands', index, 'mode'],
          });
        }
      });
    }
  });

export const parse = (json: any) => schema.parse(json);

export const toJSONSchema = () => z.toJSONSchema(schema);

export type IPluginManifest = z.infer<typeof schema>;

export type ICommandTextMatch = z.infer<typeof commandTextMatchSchema>;

export type ICommandTriggerMatch = z.infer<typeof commandTriggerMatchSchema>;

export type ICommandRegexpMatch = z.infer<typeof commandRegexpMatchSchema>;

export type ICommandFileMatch = z.infer<typeof commandFileMatchSchema>;

export type ICommandMatch = z.infer<typeof commandMatchSchema>;

export type ICommand = z.infer<typeof commandSchema>;
