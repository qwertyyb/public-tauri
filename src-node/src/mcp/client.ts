import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { MCPServerConfig, MCPConfigManager } from './config';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface MCPServerStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  pid?: number;
  error?: string;
  tools?: string[];
}

export class MCPClientManager extends EventEmitter {
  private clients: Map<string, Client> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private configManager: MCPConfigManager;
  private statuses: Map<string, MCPServerStatus> = new Map();

  constructor(configManager: MCPConfigManager) {
    super();
    this.configManager = configManager;
  }

  async connectAll(): Promise<void> {
    const servers = await this.configManager.getAllServers();
    
    for (const [name, config] of Object.entries(servers)) {
      if (config.disabled) {
        logger.info(`Skipping disabled MCP server: ${name}`);
        continue;
      }
      
      try {
        await this.connectServer(name, config);
      } catch (error) {
        logger.error(`Failed to connect MCP server ${name}:`, error);
      }
    }
  }

  async connectServer(name: string, config: MCPServerConfig): Promise<void> {
    if (this.clients.has(name)) {
      logger.warn(`MCP server ${name} is already connected`);
      return;
    }

    this.updateStatus(name, 'connecting');

    try {
      // 创建子进程
      const args = config.args || [];
      const env = { ...process.env, ...config.env };
      
      const childProcess = spawn(config.command, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      this.processes.set(name, childProcess);

      // 设置错误处理
      childProcess.on('error', (error) => {
        logger.error(`MCP server ${name} process error:`, error);
        this.updateStatus(name, 'error', error.message);
        this.disconnectServer(name);
      });

      childProcess.on('exit', (code, signal) => {
        logger.warn(`MCP server ${name} exited with code ${code}, signal ${signal}`);
        this.updateStatus(name, 'disconnected');
        this.disconnectServer(name);
      });

      // 创建 MCP 客户端
      const transport = new StdioClientTransport({
        reader: childProcess.stdout!,
        writer: childProcess.stdin!
      });

      const client = new Client({
        name: `public-tauri-${name}`,
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });

      await client.connect(transport);
      
      this.clients.set(name, client);
      this.updateStatus(name, 'connected', undefined, childProcess.pid);

      // 获取可用工具
      const tools = await this.getServerTools(name);
      this.updateStatus(name, 'connected', undefined, childProcess.pid, tools);

      logger.info(`MCP server ${name} connected successfully`);
      this.emit('serverConnected', { name, tools });

    } catch (error) {
      logger.error(`Failed to connect MCP server ${name}:`, error);
      this.updateStatus(name, 'error', (error as Error).message);
      throw error;
    }
  }

  async disconnectServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    const process = this.processes.get(name);

    if (client) {
      try {
        await client.close();
      } catch (error) {
        logger.error(`Error closing MCP client ${name}:`, error);
      }
      this.clients.delete(name);
    }

    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(name);
    }

    this.updateStatus(name, 'disconnected');
    logger.info(`MCP server ${name} disconnected`);
    this.emit('serverDisconnected', { name });
  }

  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.clients.keys());
    await Promise.all(serverNames.map(name => this.disconnectServer(name)));
  }

  async callTool(serverName: string, toolName: string, args: any = {}): Promise<any> {
    const client = this.clients.get(serverName);
    
    if (!client) {
      throw new Error(`MCP server ${serverName} is not connected`);
    }

    try {
      const result = await client.request({
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      });
      
      logger.info(`Called tool ${toolName} on server ${serverName}`);
      return result;
    } catch (error) {
      logger.error(`Error calling tool ${toolName} on server ${serverName}:`, error);
      throw error;
    }
  }

  async getServerTools(serverName: string): Promise<string[]> {
    const client = this.clients.get(serverName);
    
    if (!client) {
      throw new Error(`MCP server ${serverName} is not connected`);
    }

    try {
      const result = await client.request({
        method: 'tools/list'
      });
      
      return result.tools?.map((tool: any) => tool.name) || [];
    } catch (error) {
      logger.error(`Error getting tools from server ${serverName}:`, error);
      return [];
    }
  }

  async getAllServerTools(): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};
    
    for (const [serverName] of this.clients) {
      try {
        result[serverName] = await this.getServerTools(serverName);
      } catch (error) {
        logger.error(`Error getting tools from server ${serverName}:`, error);
        result[serverName] = [];
      }
    }
    
    return result;
  }

  getStatuses(): MCPServerStatus[] {
    return Array.from(this.statuses.values());
  }

  getServerStatus(serverName: string): MCPServerStatus | null {
    return this.statuses.get(serverName) || null;
  }

  private updateStatus(
    name: string, 
    status: MCPServerStatus['status'], 
    error?: string, 
    pid?: number, 
    tools?: string[]
  ): void {
    const serverStatus: MCPServerStatus = {
      name,
      status,
      error,
      pid,
      tools
    };
    
    this.statuses.set(name, serverStatus);
    this.emit('statusChanged', serverStatus);
  }

  async reloadConfig(): Promise<void> {
    await this.disconnectAll();
    await this.connectAll();
  }
}