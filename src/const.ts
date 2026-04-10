import type OpenAI from 'openai';
import { utils, clipboard, mainWindow } from '@public/core';

export const POP_TO_ROOT_TIMEOUT = 90 * 1000;

export const AI_ASSISTANT_PROMPT = '你是一个运行在MacOS系统上的AI助手，能够通过提供的工具或直接调用系统资源解决用户问题。';

export const SUMMARY_PROMPT = `<role>
Context Extraction Assistant
</role>

<primary_objective>
Your sole objective in this task is to extract the highest quality/most relevant context from the conversation history below.
</primary_objective>

<objective_information>
You're nearing the total number of input tokens you can accept, so you must extract the highest quality/most relevant pieces of information from your conversation history.
This context will then overwrite the conversation history presented below. Because of this, ensure the context you extract is only the most important information to your overall goal.
</objective_information>

<instructions>
The conversation history below will be replaced with the context you extract in this step. Because of this, you must do your very best to extract and record all of the most important context from the conversation history.
You want to ensure that you don't repeat any actions you've already completed, so the context you extract from the conversation history should be focused on the most important information to your overall goal.
</instructions>

The user will message you with the full message history you'll be extracting context from, to then replace. Carefully read over it all, and think deeply about what information is most important to your overall goal that should be saved:

With all of this in mind, please carefully read over the entire conversation history, and extract the most important and relevant context to replace it so that you can free up space in the conversation history.
Respond ONLY with the extracted context. Do not include any additional information, or text before or after the extracted context.

<messages>
Messages to summarize:
{messages}
</messages>`;

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
  BLURRED: 'window:blurred',
} as const;
