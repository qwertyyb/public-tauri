# MCP (Model Context Protocol) Client

这个模块实现了 MCP 客户端功能，允许连接和管理多个 MCP 服务器。

## 功能特性

- 📁 读取类似 VSCode 的 MCP 配置格式
- 🔗 支持多个 MCP 服务器同时连接
- 🛠️ 自动发现和调用服务器工具
- 📊 实时状态监控
- 🔄 热重载配置

## 配置格式

配置文件位于 `~/.public-tauri/mcp.json`，格式如下：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users"],
      "disabled": false
    },
    "git": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "."],
      "disabled": false
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      },
      "disabled": true
    }
  }
}
```

### 服务器配置字段

- `command`: 启动服务器的命令
- `args`: 命令参数数组（可选）
- `env`: 环境变量对象（可选）
- `disabled`: 是否禁用此服务器（可选，默认 false）

## API 接口

### 服务器管理

#### 获取所有服务器状态
```http
GET /api/mcp/servers
```

#### 获取配置
```http
GET /api/mcp/config
```

#### 添加服务器配置
```http
POST /api/mcp/config
Content-Type: application/json

{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users"],
  "disabled": false
}
```

#### 删除服务器配置
```http
DELETE /api/mcp/config/:name
```

#### 连接服务器
```http
POST /api/mcp/connect/:name
```

#### 断开服务器
```http
POST /api/mcp/disconnect/:name
```

### 工具管理

#### 获取服务器工具列表
```http
GET /api/mcp/tools/:name
```

#### 获取所有服务器工具
```http
GET /api/mcp/tools
```

#### 调用工具
```http
POST /api/mcp/call/:server/:tool
Content-Type: application/json

{
  "path": "/path/to/file"
}
```

### 配置管理

#### 重新加载配置
```http
POST /api/mcp/reload
```

## 使用示例

### 1. 添加文件系统服务器

```bash
curl -X POST http://localhost:2345/api/mcp/config \
  -H "Content-Type: application/json" \
  -d '{
    "name": "filesystem",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users"],
    "disabled": false
  }'
```

### 2. 获取可用工具

```bash
curl http://localhost:2345/api/mcp/tools
```

### 3. 调用文件读取工具

```bash
curl -X POST http://localhost:2345/api/mcp/call/filesystem/read_file \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/Users/username/example.txt"
  }'
```

## 支持的 MCP 服务器

### 官方服务器

- **@modelcontextprotocol/server-filesystem**: 文件系统操作
- **@modelcontextprotocol/server-git**: Git 仓库操作
- **@modelcontextprotocol/server-brave-search**: Brave 搜索引擎
- **@modelcontextprotocol/server-github**: GitHub API 操作

### 社区服务器

可以通过 npm 搜索更多 MCP 服务器：
```bash
npm search @modelcontextprotocol/server
```

## 事件系统

MCP 客户端管理器会发出以下事件：

- `serverConnected`: 服务器连接成功
- `serverDisconnected`: 服务器断开连接
- `statusChanged`: 服务器状态改变

```typescript
import { clientManager } from './mcp';

clientManager.on('serverConnected', ({ name, tools }) => {
  console.log(`Server ${name} connected with tools: ${tools.join(', ')}`);
});
```

## 错误处理

- 服务器启动失败会自动重试
- 工具调用错误会返回详细错误信息
- 配置文件格式错误会使用默认配置

## 日志

所有操作都会记录日志，可以通过日志查看详细的运行信息。

## 安全注意事项

1. **文件系统访问**: 限制文件系统服务器的访问路径
2. **API 密钥**: 使用环境变量存储敏感信息
3. **网络访问**: 考虑限制外部服务器的网络访问
4. **命令注入**: 避免在配置中使用用户输入的参数