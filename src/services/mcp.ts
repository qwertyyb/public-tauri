import { ElMessage } from 'element-plus';

export interface MCPServerConfig {
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  disabled?: boolean;
}

export interface ServerStatus {
  name: string;
  config: MCPServerConfig;
  status?: {
    connected: boolean;
    error?: string;
  };
  tools?: Array<{ name: string; description: string }>;
  showDetails?: string[];
}

export interface ToolDetail {
  name: string;
  description: string;
  inputSchema?: {
    properties?: Record<string, {
      type?: string;
      description?: string;
    }>;
  };
}

const API_BASE = 'http://localhost:2345/api/mcp';

class MCPService {
  /**
   * 获取所有服务器配置
   */
  async getConfig(): Promise<Record<string, MCPServerConfig>> {
    try {
      const response = await fetch(`${API_BASE}/config`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get config');
      }
    } catch (error) {
      console.error('Failed to get MCP config:', error);
      throw error;
    }
  }

  /**
   * 获取所有服务器状态
   */
  async getServerStatuses(): Promise<Array<{ name: string; status: string; error?: string; tools?: string[] }>> {
    try {
      const response = await fetch(`${API_BASE}/servers`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get server statuses');
      }
    } catch (error) {
      console.error('Failed to get MCP server statuses:', error);
      throw error;
    }
  }

  /**
   * 添加服务器配置
   */
  async addServer(name: string, config: MCPServerConfig): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, config }),
      });

      const result = await response.json();

      if (result.success) {
        ElMessage.success('服务器添加成功');
      } else {
        throw new Error(result.error || 'Failed to add server');
      }
    } catch (error) {
      console.error('Failed to add MCP server:', error);
      ElMessage.error(`添加服务器失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 删除服务器配置
   */
  async removeServer(name: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/config/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        ElMessage.success('服务器删除成功');
      } else {
        throw new Error(result.error || 'Failed to remove server');
      }
    } catch (error) {
      console.error('Failed to remove MCP server:', error);
      ElMessage.error(`删除服务器失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 连接到服务器
   */
  async connectServer(name: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/connect/${encodeURIComponent(name)}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        ElMessage.success(result.message || '服务器连接成功');
      } else {
        throw new Error(result.error || 'Failed to connect server');
      }
    } catch (error) {
      console.error('Failed to connect MCP server:', error);
      ElMessage.error(`连接服务器失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 断开服务器连接
   */
  async disconnectServer(name: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/disconnect/${encodeURIComponent(name)}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        ElMessage.success(result.message || '服务器断开成功');
      } else {
        throw new Error(result.error || 'Failed to disconnect server');
      }
    } catch (error) {
      console.error('Failed to disconnect MCP server:', error);
      ElMessage.error(`断开服务器失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 获取服务器工具列表（仅名称）
   */
  async getServerTools(name: string): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE}/tools/${encodeURIComponent(name)}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get server tools');
      }
    } catch (error) {
      console.error('Failed to get MCP server tools:', error);
      throw error;
    }
  }

  /**
   * 获取服务器工具详情（包含描述和参数）
   */
  async getServerToolsWithDetails(name: string): Promise<ToolDetail[]> {
    try {
      const response = await fetch(`${API_BASE}/tools/${encodeURIComponent(name)}/details`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get server tools details');
      }
    } catch (error) {
      console.error('Failed to get MCP server tools details:', error);
      // 如果详情API失败，回退到简单工具列表
      try {
        const tools = await this.getServerTools(name);
        return tools.map(toolName => ({
          name: toolName,
          description: `${toolName} 工具`,
          inputSchema: { properties: {} },
        }));
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  /**
   * 获取所有服务器信息（配置 + 状态）
   */
  async getAllServers(): Promise<ServerStatus[]> {
    try {
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
    } catch (error) {
      console.error('Failed to get all MCP servers:', error);
      throw error;
    }
  }

  /**
   * 更新服务器配置
   */
  async updateServer(name: string, config: MCPServerConfig): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, config }),
      });

      const result = await response.json();

      if (result.success) {
        ElMessage.success('服务器配置更新成功');
      } else {
        throw new Error(result.error || 'Failed to update server');
      }
    } catch (error) {
      console.error('Failed to update MCP server:', error);
      ElMessage.error(`更新服务器配置失败: ${(error as Error).message}`);
      throw error;
    }
  }
}

export const mcpService = new MCPService();