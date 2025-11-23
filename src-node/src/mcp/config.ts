import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger';
import { isDev } from '../utils';

interface MCPStdioServerConfig {
  type: 'stdio',
  command: string,
  args?: string[],
  env?: Record<string, string>;
  disabled?: boolean
}

interface MCPStreamableHttpServerConfig {
  type: 'http',
  url: string,
  headers?: Record<string, string>;
  disabled?: boolean
}

export type MCPServerConfig = MCPStdioServerConfig | MCPStreamableHttpServerConfig;


export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export class MCPConfigManager {
  private configPath: string;

  constructor(configPath?: string) {
    // 默认配置路径，类似 VSCode 的 MCP 配置
    this.configPath = configPath || isDev() ? join(import.meta.dirname, '../../mcp.json') : join(homedir(), '.public-tauri', 'mcp.json');
  }

  async loadConfig(): Promise<MCPConfig> {
    try {
      await access(this.configPath);
      const configData = await readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData) as MCPConfig;
      logger.info(`MCP config loaded from ${this.configPath}`);
      return config;
    } catch (error) {
      logger.warn(`No MCP config found at ${this.configPath}, using default config`);
      return this.getDefaultConfig();
    }
  }

  async saveConfig(config: MCPConfig): Promise<void> {
    try {
      const configData = JSON.stringify(config, null, 2);
      await writeFile(this.configPath, configData, 'utf-8');
      logger.info(`MCP config saved to ${this.configPath}`);
    } catch (error) {
      logger.error('Failed to save MCP config:', error);
      throw error;
    }
  }


  async addServer(name: string, config: MCPServerConfig): Promise<void> {
    const currentConfig = await this.loadConfig();
    currentConfig.mcpServers[name] = config;
    await this.saveConfig(currentConfig);
  }

  async removeServer(name: string): Promise<void> {
    const currentConfig = await this.loadConfig();
    delete currentConfig.mcpServers[name];
    await this.saveConfig(currentConfig);
  }

  async getServerConfig(name: string): Promise<MCPServerConfig | null> {
    const config = await this.loadConfig();
    return config.mcpServers[name] || null;
  }

  async getAllServers(): Promise<Record<string, MCPServerConfig>> {
    const config = await this.loadConfig();
    return config.mcpServers;
  }

  private getDefaultConfig(): MCPConfig {
    return {
      mcpServers: {
        // 示例配置，类似 VSCode MCP 扩展的格式
        // "filesystem": {
        //   "command": "npx",
        //   "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
        // },
        // "git": {
        //   "command": "npx",
        //   "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "/path/to/repo"]
        // }
      },
    };
  }
}
