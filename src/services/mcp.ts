import OpenAI from 'openai';

import { type Tool as ToolSchema } from '@modelcontextprotocol/sdk/types.js';

// MCP 服务器配置类型（与后端保持一致）
export interface MCPStdioServerConfig {
  type: 'stdio',
  command: string,
  args?: string[],
  env?: Record<string, string>;
  disabled?: boolean
}

export interface MCPStreamableHttpServerConfig {
  type: 'http',
  url: string,
  headers?: Record<string, string>;
  disabled?: boolean
}

export type MCPServerConfig = MCPStdioServerConfig | MCPStreamableHttpServerConfig;

// MCP 服务器状态类型（与后端保持一致）
export interface MCPServerStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  pid?: number;
  error?: string;
  tools?: string[];
}

// 前端使用的服务器状态类型（包含配置信息）
export interface ServerStatus {
  name: string;
  config: MCPServerConfig;
  status?: {
    connected: boolean;
    error?: string;
  };
  tools?: Array<{ name: string; description?: string }>;
  showDetails?: string[];
}

// 工具详情类型
export interface ToolDetail {
  name: string;
  description: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

// API 响应类型
export interface ApiResponse<T = any> {
  errCode: number
  errMsg: string
  data?: T
}

const API_BASE = 'http://localhost:2345/api/mcp';

class MCPService {
  /**
   * 获取所有服务器配置
   */
  async getConfig(): Promise<Record<string, MCPServerConfig>> {
    const response = await fetch(`${API_BASE}/config`);
    const result = await response.json();

    if (result.errCode === 0) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get config');
  }

  /**
   * 获取所有服务器状态
   */
  async getServerStatuses(): Promise<MCPServerStatus[]> {
    const response = await fetch(`${API_BASE}/servers`);
    const result = await response.json();

    if (result.errCode === 0) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get server statuses');
  }

  /**
   * 添加服务器配置
   */
  async addServer(name: string, config: MCPServerConfig): Promise<void> {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, config }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to add server');
    }
  }

  /**
   * 删除服务器配置
   */
  async removeServer(name: string): Promise<void> {
    const response = await fetch(`${API_BASE}/config/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to remove server');
    }
  }

  /**
   * 连接到服务器
   */
  async connectServer(name: string): Promise<string> {
    const response = await fetch(`${API_BASE}/connect/${encodeURIComponent(name)}`, {
      method: 'POST',
    });

    const result = await response.json();

    if (result.errCode === 0) {
      return result.message || '服务器连接成功';
    }
    throw new Error(result.error || 'Failed to connect server');
  }

  /**
   * 断开服务器连接
   */
  async disconnectServer(name: string): Promise<string> {
    const response = await fetch(`${API_BASE}/disconnect/${encodeURIComponent(name)}`, {
      method: 'POST',
    });

    const result = await response.json();

    if (result.errCode === 0) {
      return result.message || '服务器断开成功';
    }
    throw new Error(result.error || 'Failed to disconnect server');
  }

  /**
   * 获取服务器工具详情（包含描述和参数）
   */
  async getServerTools(name: string): Promise<ToolSchema[]> {
    const response = await fetch(`${API_BASE}/tools/${encodeURIComponent(name)}`);
    const result = await response.json();

    if (result.errCode === 0) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get server tools details');
  }

  /**
   * 获取所有服务器信息（配置 + 状态）
   */
  async getAllServers(): Promise<ServerStatus[]> {
    const [configData, statusData] = await Promise.all([
      this.getConfig(),
      this.getServerStatuses(),
    ]);

    // 将状态数组转换为对象映射
    const statusMap = statusData.reduce((acc: Record<string, any>, status: any) => {
      acc[status.name] = {
        connected: status.status === 'connected',
        error: status.error,
      };
      return acc;
    }, {});

    return Object.entries(configData).map(([name, config]) => ({
      name,
      config,
      status: statusMap[name],
      tools: [],
      showDetails: [],
    }));
  }

  /**
   * 更新服务器配置
   */
  async updateServer(name: string, config: MCPServerConfig): Promise<void> {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, config }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to update server');
    }
  }

  /**
   * 获取所有 MCP 服务器和工具名
   */
  async getAllMCPTools(): Promise<Record<string, string[]>> {
    const response = await fetch(`${API_BASE}/tools`);
    const result = await response.json();

    if (result.errCode === 0) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get MCP tools');
  }

  /**
   * 获取所有 MCP 服务器和工具 Schema
   */
  async getAllServersTools() {
    const config = await this.getConfig();
    const tools = await Promise.all(Object.keys(config).map(async (name) => {
      const tools = await this.getServerTools(name);
      return { name, tools };
    }));
    const results = tools.reduce<Record<string, ToolSchema[]>>((acc, item) => ({ ...acc, [item.name]: item.tools }), {});
    return results;
  }

  /**
   * 调用 MCP 工具
   */
  async callMCPTool(serverName: string, toolName: string, args: Record<string, any>): Promise<any> {
    const response = await fetch(`${API_BASE}/call/${serverName}/${toolName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });

    const result = await response.json();

    if (result.errCode === 0) {
      return result.data;
    }
    throw new Error(result.error || '未知错误');
  }
}

export const mcpService = new MCPService();

/**
 * 工具函数：将 MCP 工具数据转换为 OpenAI 格式
 */
export const convertMCPToolsToOpenAIFormat = (servers: Record<string, ToolSchema[]>): OpenAI.ChatCompletionTool[] => {
  const tools: OpenAI.ChatCompletionTool[] = [];
  console.log('servers', servers);
  for (const [serverName, toolList] of Object.entries(servers)) {
    for (const tool of toolList) {
      tools.push({
        type: 'function',
        function: {
          name: `mcp_${serverName}_${tool.name}`,
          description: tool.description || `MCP工具: ${tool.name} (来自服务器: ${serverName})`,
          parameters: tool.inputSchema,
        },
      });
    }
  }

  return tools;
};

/**
 * 工具函数：解析 MCP 工具函数名称
 */
export const parseMCPToolFunctionName = (functionName: string): { serverName: string; toolName: string } => {
  const parts = functionName.split('_').slice(1);
  const serverName = parts[0];
  const toolName = parts.slice(1).join('_');

  return { serverName, toolName };
};

/**
 * 工具函数：格式化 MCP 工具调用结果
 */
export const formatMCPToolResult = (result: any): string => {
  const formattedResult = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  return formattedResult;
};
