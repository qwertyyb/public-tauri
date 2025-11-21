import type OpenAI from 'openai';
import { utils, clipboard, mainWindow } from '@public/api/core';

export const POP_TO_ROOT_TIMEOUT = 90 * 1000;

export const AI_ASSISTANT_PROMPT = '你是一名Mac电脑专家，擅长使用Bash和AppleScript脚本，只能使用这些工具解决问题。但如果用户的请求是你自身可以通过理解和语言能力完成的(例如翻译、润色、理解、写作等)，你应当直接回答，不调用任何脚本或工具。你不允许仅仅提供口头建议，而是必须使用脚本代码直接获取信息或执行操作。遇到需要用户输入或选择的场景，必须通过AppleScript弹窗完成，不允许使用文字提示。你拥有一系列可调用的工具(function call)，请在需要时选择合适的工具调用。输出的内容要尽量简洁，符合即时反馈的要求。你知道用户通常使用Chrome浏览器，请在涉及网页或文件打开时优先考虑Chrome浏览器。';

export const AI_TOOLS_DEFINITIONS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'runBashCommand',
      description: '运行 bash 命令',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: '要运行的 bash 命令',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'runAppleScript',
      description: '运行 AppleScript',
      parameters: {
        type: 'object',
        properties: {
          script: {
            type: 'string',
            description: '要运行的 AppleScript',
          },
        },
        required: ['script'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getFrontmostApplication',
      description: '获取当前最前方的应用',
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCurrentPath',
      description: '获取Finder当前目录的路径',
    },
  },
  {
    type: 'function',
    function: {
      name: 'getSelectedPath',
      description: '获取Finder当前选中的文件或文件夹的路径',
    },
  },
  {
    type: 'function',
    function: {
      name: 'readClipboard',
      description: '读取剪贴板内容',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'enum',
            enum: ['text', 'html'],
            description: '读取内容的类型，text 或 html',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'paste',
      description: '把内容粘贴到最前方的应用中',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'enum',
            enum: ['text', 'html'],
            description: '粘贴内容的类型，text 或 html',
          },
          content: {
            type: 'string',
            description: '要粘贴的内容',
          },
        },
      },
    },
  },
];

export const AI_TOOLS = {
  runBashCommand: (options: { command: string }) => utils.runCommand(options.command).catch(err => `执行脚本失败: ${err.message}`),
  runAppleScript: (options: { script: string }) => utils.runAppleScript(options.script).catch(err => `运行 AppleScript 失败： ${err.message}`),
  getCurrentPath: () => utils.getCurrentPath(),
  getSelectedPath: () => utils.getSelectedPath(),
  getFrontmostApplication: () => utils.getFrontmostApplication(),
  readClipboard: (options: { type: 'text' | 'html' }) => (options.type === 'text' ? clipboard.readText() : clipboard.readHtml()),
  paste: async (options: { type: 'text' | 'html', content: string }) => {
    if (options.type === 'text') {
      await clipboard.writeText(options.content);
    } else {
      await clipboard.writeHtml(options.content);
    }
    await mainWindow.hide();
    return clipboard.paste();
  },
};

// @ts-ignore
window.AI_TOOLS = AI_TOOLS;

export const EVENT_NAME = {
  FOCUSED: 'window:focused',
} as const;
