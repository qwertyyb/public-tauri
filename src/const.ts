import type OpenAI from 'openai';
import { utils, clipboard, mainWindow } from '@public/api/core';

export const POP_TO_ROOT_TIMEOUT = 90 * 1000;

export const AI_ASSISTANT_PROMPT = '你是一个运行在MacOS系统上的AI助手，能够通过提供的工具或直接调用系统资源解决用户问题。';

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
      parameters: {},
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCurrentPath',
      description: '获取Finder当前目录的路径',
      parameters: {},
    },
  },
  {
    type: 'function',
    function: {
      name: 'getSelectedPath',
      description: '获取Finder当前选中的文件或文件夹的路径',
      parameters: {},
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
