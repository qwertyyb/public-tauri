<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="ai-chat-container">
    <div
      ref="messagesContainer"
      class="chat-messages"
    >
      <div
        v-for="(item, index) in formattedMessages"
        :key="index"
        :class="['message', item.position]"
      >
        <MarkdownRenderer
          v-if="item.position === 'right'"
          class="message-content"
          :content="getMessageContent(item.messages[0])"
        />
        <div
          v-else-if="item.position === 'left'"
          class="message-content"
        >
          <template
            v-for="(message, mIndex) in item.messages"
            :key="mIndex"
          >
            <!-- 显示消息内容 -->
            <MarkdownRenderer
              v-if="getMessageContent(message)"
              class="text-content"
              :content="getMessageContent(message)"
            />
            <!-- 显示工具调用 -->
            <div
              v-for="(toolCall, toolIndex) in ('tool_calls' in message ? message.tool_calls : [])"
              :key="toolIndex"
              class="tool-call"
            >
              <AIToolCall
                class="tool-call-container"
                :tool="{
                  name: ('function' in toolCall) ? toolCall.function.name : toolCall.custom.name,
                  arguments: ('function' in toolCall) ? toolCall.function.arguments : toolCall.custom.input,
                }"
                :status="toolCallState[toolCall.id]?.status"
                :result="toolCallState[toolCall.id]?.result"
              />
            </div>
          </template>
        </div>
      </div>
    </div>
    <div class="chat-input">
      <el-input
        ref="textarea"
        v-model="userInput"
        type="textarea"
        autofocus
        placeholder="请AI帮你执行任务"
        class="user-input"
        autosize
        @keydown="keyDownHandler"
      />
      <el-button
        class="send-btn"
        type="primary"
        @click="sendMessage"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, toRaw, useTemplateRef, computed, type Ref } from 'vue';
import OpenAI from 'openai';
import { ElInput, ElButton } from 'element-plus';
import { isKeyPressed } from '@/utils/keyboard';
import { AI_ASSISTANT_PROMPT, AI_TOOLS_DEFINITIONS, AI_TOOLS } from '@/const';
import { getPreferenceValues } from '@/plugin/manager';
import { popToRoot } from '@/plugin/utils';
import { onPageEnter } from '@/router';
import { fetch } from '@public/core';
import logger from '@/utils/logger';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import { mcpService, convertMCPToolsToOpenAIFormat, parseMCPToolFunctionName, formatMCPToolResult } from '@/services/mcp';
import AIToolCall from '@/components/ai/AIToolCall.vue';
import type { ToolCallStatus } from '@/components/ai/const';

const props = defineProps<{ query?: string }>();

const messages = ref<OpenAI.ChatCompletionMessageParam[]>([{
  role: 'system',
  content: AI_ASSISTANT_PROMPT,
}]);

const formattedMessages = computed(() => {
  const list: {
    position: 'left' | 'right',
    messages: OpenAI.ChatCompletionMessageParam[]
  }[] = [];
  messages.value.forEach((item) => {
    if (item.role === 'user') {
      list.push({ position: 'right', messages: [item] });
      return;
    }
    if (item.role === 'tool') return;
    const last = list[list.length - 1];
    if (last?.position === 'left') {
      last.messages.push(item);
      return;
    }
    list.push({ position: 'left', messages: [item] });
  });
  return list;
});

const userInput = ref<string>(props.query || '');
const textarea = useTemplateRef('textarea');
const messagesContainer = ref<HTMLDivElement | null>(null);

const toolCallState: Ref<Record<string, { status: ToolCallStatus, result?: string }>> = ref({});

const scrollToBottom = async (): Promise<void> => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const getMessageContent = (message: any): string => {
  if (Array.isArray(message.content)) {
    return message.content.map((item: any) => {
      if (item.type === 'text') return item.text;
      return item.refusal || '';
    }).join('\n')
      .trim();
  }
  return message.content.trim() || '';
};

const preferences = getPreferenceValues('ai');

const client = new OpenAI({
  apiKey: preferences.apiKey as string, // 模型APIKey
  baseURL: preferences.baseURL as string, // 模型API地址
  dangerouslyAllowBrowser: true,
  // @ts-ignore
  fetch,
});

const mcpTools = ref<OpenAI.ChatCompletionTool[]>([]);

// 获取 MCP 服务器和工具
const loadMCPTools = async () => {
  try {
    const tools = convertMCPToolsToOpenAIFormat(await mcpService.getAllServersTools());
    mcpTools.value = tools;
    logger.info('Loaded MCP tools:', mcpTools.value.length);
  } catch (error) {
    logger.error('Failed to load MCP tools:', error);
  }
};

// 初始化时加载 MCP 工具
loadMCPTools();

// 定期重新加载 MCP 工具（每30秒）
setInterval(loadMCPTools, 30000);

const getLastMessage = () => messages.value[messages.value.length - 1];

const runTools = async (toolCall: OpenAI.ChatCompletionMessageToolCall) => {
  if (!('function' in toolCall)) {
    return '工具调用格式错误';
  }

  const functionName = toolCall.function.name;
  const functionArgs = toolCall.function.arguments;

  if (functionName in AI_TOOLS) {
    const args = functionArgs ? JSON.parse(functionArgs) : undefined;
    try {
      toolCallState.value[toolCall.id] = { status: 'running' };
      const result = await AI_TOOLS[functionName as keyof typeof AI_TOOLS](args);
      toolCallState.value[toolCall.id] = { status: 'success', result: typeof result === 'string' ? result : JSON.stringify(result) };
      if (!result) return '';
      if (typeof result === 'string') return result;
      return JSON.stringify(result);
    } catch (err) {
      console.error(err);
      toolCallState.value[toolCall.id] = { status: 'error', result: String(err) };
      return `调用${functionName}失败，失败信息如下， ${String(err)}`;
    }
  }

  if (functionName.startsWith('mcp_')) {
    // 处理 MCP 工具调用
    try {
      toolCallState.value[toolCall.id] = { status: 'running' };
      const args = functionArgs ? JSON.parse(functionArgs) : {};
      const { serverName, toolName } = parseMCPToolFunctionName(functionName);
      const result = await mcpService.callMCPTool(serverName, toolName, args);
      const formattedResult = formatMCPToolResult(result);
      toolCallState.value[toolCall.id] = { status: 'success', result: typeof result === 'string' ? result : JSON.stringify(result) };
      return formattedResult;
    } catch (err) {
      console.error(err);
      toolCallState.value[toolCall.id] = { status: 'error', result: String(err) };
      return String(err);
    }
  }

  return `工具${functionName}不存在，无法调用`;
};

const ask = async () => {
  // 合并原生工具和 MCP 工具
  const allTools = [...AI_TOOLS_DEFINITIONS, ...mcpTools.value];

  const completion = await client.chat.completions.create({
    model: preferences.model as string,
    messages: toRaw(messages.value),
    tools: allTools,
    tool_choice: 'auto',
    stream: true,
  }).catch((err) => {
    messages.value.push({ role: 'assistant', content: err.message });
    scrollToBottom();
    throw err;
  });
  messages.value.push({
    role: 'assistant',
    content: '',
  });
  for await (const chunk of completion) {
    const lastMessage = getLastMessage();
    if (chunk.choices[0]?.finish_reason === 'tool_calls' && lastMessage.role === 'assistant' && 'tool_calls' in lastMessage) {
      // 工具调用的返回结束，可以开始调用工具了
      const results: OpenAI.ChatCompletionToolMessageParam[] = await Promise.all(lastMessage.tool_calls!.map(async (toolCall) => {
        const result = await runTools(toolCall);
        return { role: 'tool', content: result, tool_call_id: toolCall.id };
      }));
      messages.value.push(...results);
      scrollToBottom();
      // 工具调用完成，再次调用大模型总结结果
      return ask();
    }
    // 工具调用的流式返回
    if (chunk.choices[0]?.delta?.tool_calls) {
      const deltaToolCalls = chunk.choices[0]?.delta?.tool_calls;
      if (deltaToolCalls) {
        const msg = lastMessage as OpenAI.ChatCompletionAssistantMessageParam;
        if (!('tool_calls' in lastMessage)) {
          msg.tool_calls = [];
        }
        deltaToolCalls.forEach((deltaToolCall) => {
          if (deltaToolCall.index === (lastMessage as OpenAI.ChatCompletionAssistantMessageParam).tool_calls!.length) {
            msg.tool_calls!.push({
              id: deltaToolCall.id!,
              function: {
                name: deltaToolCall.function!.name!,
                arguments: deltaToolCall.function!.arguments || '',
              },
              type: 'function',
            });
          } else {
            const existingCall = msg.tool_calls![deltaToolCall.index];
            if ('function' in existingCall) {
              existingCall.function.arguments += deltaToolCall.function!.arguments || '';
            }
          }
        });
        scrollToBottom();
      }
    }
    // 大模型正常输出
    if (chunk.choices[0]?.delta?.content) {
      const content = chunk.choices[0]?.delta?.content || '';
      lastMessage.content += content;
      scrollToBottom();
    }
  }
};

const sendMessage = async (): Promise<void> => {
  if (!userInput.value.trim()) return;

  // Add user message
  scrollToBottom();
  messages.value.push({ role: 'user', content: userInput.value });
  userInput.value = '';
  scrollToBottom();

  // Send message to OpenAI
  await ask();
};

const keyDownHandler = (e: KeyboardEvent | Event) => {
  if (!(e instanceof KeyboardEvent)) return;
  if (isKeyPressed(e, 'Enter')) {
    e.preventDefault();
    sendMessage();
    return;
  }
  if (isKeyPressed(e, 'Escape')) {
    if (userInput.value) {
      userInput.value = '';
      return;
    }
    popToRoot();
    return;
  }
};

onPageEnter(async () => {
  await nextTick();
  textarea.value?.focus();
});
</script>

<style scoped lang="scss">
.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  margin: 0 auto;
  padding-top: 48px;
  box-sizing: border-box;
  font-weight: normal;
  --message-bg: light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, .1));
}

.chat-messages {
  height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  margin-bottom: 12px;
  max-width: 80%;
  width: fit-content;
  overflow: auto;
  &.right {
    margin-left: auto;
  }
  &.left {
    width: 80%;
  }
  .tool-call {
    margin-bottom: 12px;
  }
  .text-content + .tool-call {
    margin-top: 12px;
  }
}

.message-content {
  padding: 10px;
  border-radius: 6px;
  background-color: var(--message-bg);
  border: 1px solid light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.2));
}

.tool-call-container {
  font-weight: normal;
  .tool-call-arguments {
    word-break: break-all;
    opacity: 0.8;
  }
  .tool-call-result {
    margin-top: 12px;
    word-break: break-all;
    line-height: 1.4;
    opacity: 0.8;
  }
}

// Dark mode styles for tool calls
@media (prefers-color-scheme: dark) {
  .tool-call {
    h4 {
      color: #64b5f6;
    }

    pre {
      background-color: #1e1e1e;
      color: #dcdcdc;
    }
  }
}

.chat-input {
  display: flex;
  padding: 12px;
  border-top: 1px solid light-dark(#bbb, rgba(255, 255, 255, 0.2));
}

.user-input {
  flex: 1;
}

.send-btn {
  margin-left: 8px;
}
</style>
