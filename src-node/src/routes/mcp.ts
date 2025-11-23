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
  try {
    const statuses = clientManager.getStatuses();
    ctx.body = {
      success: true,
      data: statuses,
    };
  } catch (error) {
    logger.error('Error getting MCP server statuses:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to get server statuses',
    };
  }
});

// 获取服务器配置
mcpRouter.get('/config', async (ctx) => {
  try {
    const config = await configManager.getAllServers();
    ctx.body = {
      success: true,
      data: config,
    };
  } catch (error) {
    logger.error('Error getting MCP config:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to get config',
    };
  }
});

// 添加服务器配置
mcpRouter.post('/config', async (ctx) => {
  try {
    const { name, config  } = ctx.request.body as { name: string, config: MCPServerConfig };

    if (!name || !config) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Name and config are required',
      };
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

    ctx.body = {
      success: true,
      message: 'Server configuration added successfully',
    };
  } catch (error) {
    logger.error('Error adding MCP server config:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to add server configuration',
    };
  }
});

// 删除服务器配置
mcpRouter.delete('/config/:name', async (ctx) => {
  try {
    const { name } = ctx.params as { name: string };

    // 先断开连接
    await clientManager.disconnectServer(name);

    // 删除配置
    await configManager.removeServer(name);

    ctx.body = {
      success: true,
      message: 'Server configuration removed successfully',
    };
  } catch (error) {
    logger.error('Error removing MCP server config:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to remove server configuration',
    };
  }
});

// 连接到服务器
mcpRouter.post('/connect/:name', async (ctx) => {
  try {
    const { name } = ctx.params as { name: string };
    const serverConfig = await configManager.getServerConfig(name);

    if (!serverConfig) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        error: 'Server configuration not found',
      };
      return;
    }

    await clientManager.connectServer(name, serverConfig);

    ctx.body = {
      success: true,
      message: 'Server connected successfully',
    };
  } catch (error) {
    logger.error('Error connecting to MCP server:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to connect to server',
    };
  }
});

// 断开服务器连接
mcpRouter.post('/disconnect/:name', async (ctx) => {
  try {
    const { name } = ctx.params as { name: string };

    await clientManager.disconnectServer(name);

    ctx.body = {
      success: true,
      message: 'Server disconnected successfully',
    };
  } catch (error) {
    logger.error('Error disconnecting from MCP server:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to disconnect from server',
    };
  }
});

// 获取服务器工具列表（仅名称）
mcpRouter.get('/tools/:name', async (ctx) => {
  try {
    const { name } = ctx.params as { name: string };
    const tools = await clientManager.getServerTools(decodeURIComponent(name));

    ctx.body = {
      success: true,
      data: tools,
    };
  } catch (error) {
    logger.error('Error getting MCP server tools:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to get server tools',
    };
  }
});

// 获取服务器工具详情（包含描述和参数）
mcpRouter.get('/tools/:name/details', async (ctx) => {
  try {
    const { name } = ctx.params as { name: string };
    const tools = await clientManager.getServerToolsWithDetails(decodeURIComponent(name));

    ctx.body = {
      success: true,
      data: tools,
    };
  } catch (error) {
    logger.error('Error getting MCP server tools details:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to get server tools details',
    };
  }
});

// 调用工具
mcpRouter.post('/call/:server/:tool', async (ctx) => {
  try {
    const { server, tool } = ctx.params as { server: string, tool: string };
    const args = ctx.request.body || {};

    const result = await clientManager.callTool(server, tool, args);

    ctx.body = {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error('Error calling MCP tool:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to call tool',
      details: (error as Error).message,
    };
  }
});

// 获取所有服务器的工具
mcpRouter.get('/tools', async (ctx) => {
  try {
    const tools = await clientManager.getAllServerTools();

    ctx.body = {
      success: true,
      data: tools,
    };
  } catch (error) {
    logger.error('Error getting all MCP tools:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to get tools',
    };
  }
});

// 重新加载配置
mcpRouter.post('/reload', async (ctx) => {
  try {
    await clientManager.reloadConfig();

    ctx.body = {
      success: true,
      message: 'Configuration reloaded successfully',
    };
  } catch (error) {
    logger.error('Error reloading MCP config:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to reload configuration',
    };
  }
});

export default mcpRouter;
