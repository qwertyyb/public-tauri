<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="ai-chat-container">
    <div
      ref="messagesContainer"
      class="chat-messages"
    >
      <div
        v-for="(message, index) in messages.filter(item => item.role !== 'tool')"
        :key="index"
        :class="['message', message.role]"
      >
        <MarkdownRenderer
          v-if="message.role === 'system'"
          class="message-content"
          :content="getMessageContent(message)"
        />
        <template v-else-if="message.role === 'assistant'">
          <!-- 显示工具调用 -->
          <div
            v-for="(toolCall, toolIndex) in message.tool_calls || []"
            :key="toolIndex"
            class="tool-call"
          >
            <CollapsedContainer
              class="tool-call-container"
              :title="'工具调用' + (('function' in toolCall) ? toolCall.function.name : toolCall.custom.name)"
            >
              <p class="tool-call-arguments">
                参数: {{ ('function' in toolCall) ? toolCall.function.arguments : toolCall.custom.input }}
              </p>

              <p
                v-if="getToolResult(toolCall.id)"
                class="tool-call-result"
              >
                结果: {{ getToolResult(toolCall.id) }}
              </p>
            </CollapsedContainer>
          </div>
          <!-- 显示消息内容 -->
          <MarkdownRenderer
            v-if="message.content"
            class="message-content"
            :content="getMessageContent(message)"
          />
        </template>
        <div
          v-else-if="message.role === 'user'"
          class="message-content"
        >
          {{ message.content }}
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
import { ref, nextTick, toRaw, useTemplateRef } from 'vue';
import OpenAI from 'openai';
import { ElInput, ElButton } from 'element-plus';
import { isKeyPressed } from '@/utils/keyboard';
import { AI_ASSISTANT_PROMPT, AI_TOOLS_DEFINITIONS, AI_TOOLS } from '@/const';
import { getPreferenceValues } from '@/plugin/manager';
import { popToRoot } from '@/plugin/utils';
import { onPageEnter } from '@public/api/router';
import { fetch } from '@public/api/core';
import logger from '@/utils/logger';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import CollapsedContainer from '@/components/CollapsedContainer.vue';

const props = defineProps<{ query?: string }>();

const messages = ref<OpenAI.ChatCompletionMessageParam[]>([{
  role: 'system',
  content: AI_ASSISTANT_PROMPT,
}]);

const userInput = ref<string>(props.query || '');
const textarea = useTemplateRef('textarea');
const messagesContainer = ref<HTMLDivElement | null>(null);

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
    }).join('\n');
  }
  return message.content || '';
};

const preferences = getPreferenceValues('ai');

const client = new OpenAI({
  apiKey: preferences.apiKey as string, // 模型APIKey
  baseURL: preferences.baseURL as string, // 模型API地址
  dangerouslyAllowBrowser: true,
});

// MCP 相关状态
const mcpServers = ref<Record<string, string[]>>({});
const mcpTools = ref<OpenAI.ChatCompletionTool[]>([]);

const getToolResult = (toolCallId: string) => messages.value.find(item => item.role === 'tool' && item.tool_call_id === toolCallId);

// 获取 MCP 服务器和工具
const loadMCPTools = async () => {
  try {
    const response = await fetch('http://localhost:2345/api/mcp/tools');
    const result = await response.json();

    if (result.success) {
      mcpServers.value = result.data;

      // 直接从返回的数据中构建工具列表
      const tools: OpenAI.ChatCompletionTool[] = [];

      for (const [serverName, toolList] of Object.entries(result.data)) {
        if (Array.isArray(toolList)) {
          for (const toolName of toolList) {
            tools.push({
              type: 'function',
              function: {
                name: `mcp_${serverName}_${toolName}`,
                description: `MCP工具: ${toolName} (来自服务器: ${serverName})`,
                parameters: {
                  type: 'object',
                  properties: {},
                  required: [],
                },
              },
            });
          }
        }
      }


      mcpTools.value = tools;
      logger.info('Loaded MCP tools:', tools.length);
    }
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
      const result = await AI_TOOLS[functionName as keyof typeof AI_TOOLS](args);
      if (!result) return '';
      if (typeof result === 'string') return result;
      return JSON.stringify(result);
    } catch (err) {
      console.error(err);
      return `调用${functionName}失败，失败信息如下， ${String(err)}`;
    }
  }

  if (functionName.startsWith('mcp_')) {
    // 处理 MCP 工具调用
    try {
      const args = functionArgs ? JSON.parse(functionArgs) : {};

      // 解析工具名称: mcp_serverName_toolName
      const [serverName, ...parts] = functionName.split('_').slice(1);
      const toolName = parts.join('_');

      const response = await fetch(`http://localhost:2345/api/mcp/call/${serverName}/${toolName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
      });

      const result = await response.json();

      if (result.success) {
        if (typeof result.data === 'string') return result.data;
        return JSON.stringify(result.data, null, 2);
      }

      return `MCP工具调用失败: ${result.error || '未知错误'}`;
    } catch (err) {
      console.error(err);
      return `调用MCP工具${functionName}失败，失败信息如下， ${String(err)}`;
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
  &.user {
    margin-left: auto;
  }

}

.message-content {
  padding: 10px;
  border-radius: 6px;
  background-color: var(--message-bg);
  border: 1px solid light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.2));
}

.tool-call {
  margin-bottom: 12px;
  background-color: var(--message-bg);
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
