import * as z from 'zod';
import { preferenceSchema, type IActionItem } from './common';
import type { AsyncFile } from './AsyncFile';

export const commandTextMatchSchema = z.object({
  type: z.literal('text'),
  keywords: z.array(z.string(), '关键词列表，用于模糊搜索匹配。用户输入时会与这些关键词进行模糊匹配'),
});

export const commandTriggerMatchSchema = z.object({
  type: z.literal('trigger'),
  triggers: z.array(z.string(), '触发器列表，当用户输入以某个触发器开头并加空格时触发匹配'),
  title: z.string('匹配成功后显示的标题，支持 $query 变量，$query 会被替换为触发器后面的查询内容').optional(),
  subtitle: z.string('匹配成功后显示的副标题，支持 $query 变量，$query 会被替换为触发器后面的查询内容').optional(),
});

export const commandFullMatchSchema = z.object({
  type: z.literal('full'),
  title: z.string('匹配成功后显示的标题，支持 $query 变量，$query 会被替换为用户的完整输入内容').optional(),
  subtitle: z.string('匹配成功后显示的副标题，支持 $query 变量，$query 会被替换为用户的完整输入内容').optional(),
});

export const commandRegexpMatchSchema = z.object({
  type: z.literal('regexp'),
  regexp: z.string('正则表达式，用于匹配用户输入。支持 JavaScript 正则表达式语法'),
  title: z.string('匹配成功后显示的标题，支持模板字符串语法，可以使用正则匹配结果中的捕获组变量，如 ${0}, ${1} 等').optional(),
  subtitle: z.string('匹配成功后显示的副标题，支持模板字符串语法，可以使用正则匹配结果中的捕获组变量，如 ${0}, ${1} 等').optional(),
});

// 文件匹配 schema
export const commandFileMatchSchema = z.object({
  type: z.literal('file'),
  extensions: z.array(z.string(), '允许的文件扩展名列表，如 [".jpg", ".png"]').optional(),
  // mimeTypes: z.array(z.string(), '允许的 MIME 类型列表，如 ["image/jpeg", "image/png"]').optional(),
  // minSize: z.number('文件最小大小限制，单位字节').optional(),
  // maxSize: z.number('文件最大大小限制，单位字节').optional(),
  nameRegexp: z.string('文件名匹配的正则表达式').optional(),
  isDirectory: z.boolean('是否只匹配目录').optional(),
  title: z.string('匹配成功后显示的标题').optional(),
  subtitle: z.string('匹配成功后显示的副标题').optional(),
});

export const commandMatchSchema = z.union([
  commandTextMatchSchema,
  commandTriggerMatchSchema,
  commandFullMatchSchema,
  commandRegexpMatchSchema,
  commandFileMatchSchema,
]);

export const commandSchema = z.object({
  name: z.string('插件内命令的唯一名称'),
  title: z.string('命令标题，用于在应用商店中显示和在偏好设置中显示').max(60),
  subtitle: z.string('命令副标题，用于在应用商店中显示和在偏好设置中显示').max(100)
    .optional(),
  description: z.string('命令描述，用于在应用商店中显示和在偏好设置中显示').optional(),
  icon: z.string('命令的图标，如果不填写，则默认使用外层的 icon 字段').optional(),
  mode: z.enum(['listView', 'none', 'view'], '命令类型, template 为 listView 时，只能为 listView 或 none').default('none')
    .optional(),
  preferences: z.array(preferenceSchema, '命令的偏好设置').optional(),
  matches: z.array(commandMatchSchema, '命令匹配规则列表，用于定义该命令如何被用户输入触发。支持多种匹配类型：text（关键词）、trigger（触发器）、full（完全匹配）、regexp（正则表达式）、file（文件匹配）').optional(),
});

export type ICommandTextMatch = z.infer<typeof commandTextMatchSchema>;

export type ICommandTriggerMatch = z.infer<typeof commandTriggerMatchSchema>;

export type ICommandRegexpMatch = z.infer<typeof commandRegexpMatchSchema>;

export type ICommandFullMatch = z.infer<typeof commandFullMatchSchema>;

export type ICommandFileMatch = z.infer<typeof commandFileMatchSchema>;

export type ICommandMatch = z.infer<typeof commandMatchSchema>;

export type ICommand = z.infer<typeof commandSchema> & Record<string, any>;


export type ICommandTextMatchResult = { keyword: string };

export type ICommandTriggerMatchResult = { trigger: string, query: string };

export type ICommandRegexpMatchResult = { matches: RegExpMatchArray };

export type ICommandFullMatchResult = { query: string };

export type ICommandFileMatchResult = { file: AsyncFile };

export type ICommandMatchResult = ICommandTextMatchResult | ICommandTriggerMatchResult | ICommandRegexpMatchResult | ICommandFullMatchResult | ICommandFileMatchResult;

export type ICommandEnterFrom = 'search' | 'hotkey' | 'redirect';

// 配对的匹配类型和结果类型
type ICommandTextMatchPair = {
  match: ICommandTextMatch;
  result: ICommandTextMatchResult;
};

type ICommandTriggerMatchPair = {
  match: ICommandTriggerMatch;
  result: ICommandTriggerMatchResult;
};

type ICommandRegexpMatchPair = {
  match: ICommandRegexpMatch;
  result: ICommandRegexpMatchResult;
};

type ICommandFullMatchPair = {
  match: ICommandFullMatch;
  result: ICommandFullMatchResult;
};

type ICommandFileMatchPair = {
  match: ICommandFileMatch;
  result: ICommandFileMatchResult;
};

export type ICommandMatchPair =
  | ICommandTextMatchPair
  | ICommandTriggerMatchPair
  | ICommandRegexpMatchPair
  | ICommandFullMatchPair
  | ICommandFileMatchPair;

export type ICommandActionOptions = { from: 'search' } & {
  match: ICommandTextMatch;
  result: ICommandTextMatchResult;
} | { from: 'search' } & {
  match: ICommandTriggerMatch;
  result: ICommandTriggerMatchResult;
} | { from: 'search' } & {
  match: ICommandRegexpMatch;
  result: ICommandRegexpMatchResult;
} | { from: 'search' } & {
  match: ICommandFullMatch;
  result: ICommandFullMatchResult;
} | { from: 'search' } & {
  match: ICommandFileMatch;
  result: ICommandFileMatchResult;
} | { from: 'search' } | { from: 'hotkey' } | { from: 'redirect' };

export type IResultItem = {
  title: string;
  subtitle?: string;
  icon?: string;
  [x: string]: any;
};

export interface IListViewCommand<Item extends IResultItem = IResultItem & Record<string, any>> {
  onShow?: (query: string, options: ICommandActionOptions, setList: (list: Item[]) => void) => void,
  onHide?: () => void,
  onSearch?: (keyword: string, setList: (list: Item[]) => void) => void | Promise<void>,
  onSelect?: (result: Item, query: string) => string | HTMLElement | Promise<string> | Promise<HTMLElement>,
  onAction?: (result: Item, action?: IActionItem) => void | Promise<void>
}
