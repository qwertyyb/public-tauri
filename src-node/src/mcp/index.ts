// 便捷的 MCP 管理器单例
import { MCPConfigManager } from './config';
import { MCPClientManager } from './client';

export { MCPConfigManager, type MCPConfig, type MCPServerConfig } from './config';
export { MCPClientManager, type MCPServerStatus } from './client';

const configManager = new MCPConfigManager();
const clientManager = new MCPClientManager(configManager);

// 启动时自动连接
clientManager.connectAll().catch(console.error);

export { configManager, clientManager };

// 便捷函数
export async function callTool(serverName: string, toolName: string, args?: any) {
  return await clientManager.callTool(serverName, toolName, args);
}

export async function getAllTools() {
  return await clientManager.getAllServerTools();
}

export async function getServerStatuses() {
  return clientManager.getStatuses();
}
