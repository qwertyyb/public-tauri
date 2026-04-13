import * as z from 'zod';
import { preferenceSchema } from './common';
import { commandSchema, type IAction, type ICommand, type ICommandActionOptions } from './command';

export const pluginSchema = z.object({
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
  preferences: z.array(preferenceSchema, '插件的偏好设置').optional(),
  commands: z.array(commandSchema, '插件支持的命令列表').optional(),
})
  .superRefine((data, ctx) => {
    // template、main、html 三选一
    const { template, html, commands, main } = data;
    const t = template ? 1 : 0;
    const h = html ? 1 : 0;
    if (t +  h === 2) {
      ctx.addIssue({
        code: 'custom',
        message: 'template、html 只能填写一个',
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
        if (command.mode && !['listView', 'none'].includes(command.mode)) {
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
        if (command.mode && !['view', 'none'].includes(command.mode)) {
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

export const parsePluginConfig = (json: any) => pluginSchema.parse(json);

export const toJSONSchema = () => z.toJSONSchema(pluginSchema);

export type IPluginManifest = z.infer<typeof pluginSchema>;

export type IPluginLifecycle = {
  onInput?: (keyword: string) => void | ICommand[] | Promise<void> | Promise<ICommand[]>,
  onSelect?: (command: ICommand, query: string, options: ICommandActionOptions) => string | undefined | HTMLElement | Promise<string | HTMLElement | undefined>,
  onEnter?: (command: ICommand, query: string, options: ICommandActionOptions) => void,
  onExit?: (command: ICommand) => void,
  onAction?: (command: ICommand, action: IAction, keyword: string) => void,
};
