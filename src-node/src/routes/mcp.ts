import Router from '@koa/router';
import { MCPConfigManager, type MCPServerConfig } from '../mcp/config';
import { MCPClientManager } from '../mcp/client';
import { logger } from '../utils/logger';

const mcpRouter = new Router({
  prefix: '/api/mcp',
});

// 初始化 MCP 管理器
const configManager = new MCPConfigManager();
const clientManager = new MCPClientManager(configManager);

// 启动时连接所有服务器
clientManager.connectAll().catch((error) => {
  logger.error('Failed to connect MCP servers on startup:', error);
});

// 获取所有服务器状态
mcpRouter.get('/servers', async (ctx) => {
  const statuses = clientManager.getStatuses();
  ctx.ok(statuses);
});

// 获取服务器配置
mcpRouter.get('/config', async (ctx) => {
  ctx.ok(await configManager.getAllServers());
});

// 添加服务器配置
mcpRouter.post('/config', async (ctx) => {
  const { name, config  } = ctx.request.body as { name: string, config: MCPServerConfig };

  if (!name || !config) {
    ctx.error(400, 'Name and config are required');
    return;
  }

  await configManager.addServer(name, config);

  // 如果服务器未禁用，尝试连接
  if (!config.disabled) {
    const serverConfig = await configManager.getServerConfig(name);
    if (serverConfig) {
      await clientManager.connectServer(name, serverConfig);
    }
  }

  ctx.ok();
});

// 删除服务器配置
mcpRouter.delete('/config/:name', async (ctx) => {
  const { name } = ctx.params as { name: string };

  // 先断开连接
  await clientManager.disconnectServer(name);

  // 删除配置
  await configManager.removeServer(name);

  ctx.ok();
});

// 连接到服务器
mcpRouter.post('/connect/:name', async (ctx) => {
  const { name } = ctx.params as { name: string };
  const serverConfig = await configManager.getServerConfig(name);

  if (!serverConfig) {
    ctx.error(404, 'Server configuration not found');
    return;
  }

  await clientManager.connectServer(name, serverConfig);

  ctx.ok();
});

// 断开服务器连接
mcpRouter.post('/disconnect/:name', async (ctx) => {
  const { name } = ctx.params as { name: string };

  await clientManager.disconnectServer(name);

  ctx.ok();
});

// 获取服务器工具列表
mcpRouter.get('/tools/:name', async (ctx) => {
  const { name } = ctx.params as { name: string };
  const tools = await clientManager.getServerTools(decodeURIComponent(name));

  ctx.ok(tools);
});

// 调用工具
mcpRouter.post('/call/:server/:tool', async (ctx) => {
  const { server, tool } = ctx.params as { server: string, tool: string };
  const args = ctx.request.body || {};

  const result = await clientManager.callTool(server, tool, args);

  ctx.ok(result);
});

// 获取所有服务器的工具
mcpRouter.get('/tools', async (ctx) => {
  const tools = await clientManager.getAllServerTools();

  ctx.ok(tools);
});

// 重新加载配置
mcpRouter.post('/reload', async (ctx) => {
  await clientManager.reloadConfig();

  ctx.ok();
});

export default mcpRouter;
