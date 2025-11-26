<template>
  <div class="mcp-config-container">
    <div class="page-header">
      <h2>MCP 服务器配置</h2>
      <el-button
        type="primary"
        @click="showAddServerDialog = true"
      >
        添加服务器
      </el-button>
    </div>

    <!-- 服务器列表 -->
    <div class="servers-list">
      <el-empty
        v-if="servers.length === 0"
        description="暂无 MCP 服务器配置"
      />

      <el-card
        v-for="server in servers"
        :key="server.name"
        class="server-card"
      >
        <el-collapse
          v-model="server.expanded"
          class="server-collapse"
        >
          <el-collapse-item :name="server.name">
            <template #title>
              <div class="server-title">
                <div class="server-info">
                  <h3>{{ server.name }}</h3>
                  <el-tag
                    :type="server.status?.connected ? 'success' : 'danger'"
                    size="small"
                  >
                    {{ server.status?.connected ? '已连接' : '未连接' }}
                  </el-tag>
                  <el-tag
                    v-if="server.config.disabled"
                    type="warning"
                    size="small"
                  >
                    已禁用
                  </el-tag>
                </div>
                <div
                  class="server-actions"
                  @click.stop
                >
                  <el-switch
                    :model-value="!server.config.disabled"
                    size="small"
                    @change="() => toggleServerDisabled(server.name)"
                  />
                  <el-button
                    v-if="!server.config.disabled"
                    size="small"
                    @click="toggleServerStatus(server.name)"
                  >
                    {{ server.status?.connected ? '断开' : '连接' }}
                  </el-button>
                  <el-button
                    v-if="server.status?.connected && (server.tools?.length || 0) > 0"
                    size="small"
                    @click="viewServerTools(server.name)"
                  >
                    查看工具
                  </el-button>
                  <el-button
                    size="small"
                    @click="editServer(server.name)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    @click="removeServer(server.name)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </template>

            <div class="server-content">
              <!-- 工具列表 -->
              <div class="server-tools">
                <div class="tools-header">
                  <span class="tools-title">可用工具 ({{ server.tools?.length || 0 }})</span>
                  <el-button
                    size="small"
                    text
                    @click="refreshServerTools(server.name)"
                  >
                    刷新工具
                  </el-button>
                </div>

                <div
                  v-if="server.tools && server.tools.length > 0"
                  class="tools-list"
                >
                  <el-tag
                    v-for="tool in server.tools"
                    :key="tool.name"
                    class="tool-tag"
                    size="default"
                    :title="tool.description"
                  >
                    {{ tool.name }}
                  </el-tag>
                </div>

                <div
                  v-else-if="server.status?.connected && server.tools"
                  class="no-tools"
                >
                  <span class="text-muted">该服务器暂无可用工具</span>
                </div>

                <div
                  v-else-if="!server.status?.connected"
                  class="no-tools"
                >
                  <span class="text-muted">请先连接服务器以查看工具</span>
                </div>
              </div>

              <!-- 技术细节 -->
              <el-collapse
                v-model="server.showDetails"
                class="tech-details"
              >
                <el-collapse-item
                  name="details"
                  title="技术配置"
                >
                  <el-descriptions
                    :column="2"
                    size="small"
                  >
                    <el-descriptions-item label="类型">
                      {{ server.config.type }}
                    </el-descriptions-item>
                    <el-descriptions-item
                      v-if="server.config.type === 'stdio'"
                      label="命令"
                    >
                      {{ server.config.command }}
                    </el-descriptions-item>
                    <el-descriptions-item
                      v-if="server.config.type === 'stdio'"
                      label="参数"
                    >
                      {{ (server.config.args || []).join(' ') }}
                    </el-descriptions-item>
                    <el-descriptions-item
                      v-if="server.config.type === 'stdio' && server.config.env"
                      label="环境变量"
                      :span="2"
                    >
                      <div class="env-display">
                        <el-tag
                          v-for="(value, key) in server.config.env"
                          :key="key"
                          size="small"
                          class="env-tag"
                        >
                          {{ key }}={{ value }}
                        </el-tag>
                      </div>
                    </el-descriptions-item>
                    <el-descriptions-item
                      v-if="server.config.type === 'http'"
                      label="URL"
                    >
                      {{ server.config.url }}
                    </el-descriptions-item>
                  </el-descriptions>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-card>
    </div>

    <!-- MCP 服务器编辑器 -->
    <MCPServerEditor
      v-model="showAddServerDialog"
      :edit-server-name="editServerName"
      :server-config="editServerConfig"
      @success="loadServers"
    />

    <!-- 工具详情对话框 -->
    <el-dialog
      v-model="showToolsDialog"
      :title="`${currentServerName} - 工具详情`"
      width="700px"
    >
      <el-empty
        v-if="serverTools.length === 0"
        description="该服务器暂无可用工具"
      />

      <div v-else>
        <el-table
          :data="serverTools"
          style="width: 100%;height:320px"
          row-key="name"
        >
          <el-table-column
            prop="name"
            label="工具名称"
            width="200"
          />
          <el-table-column
            prop="description"
            label="描述"
          />
          <el-table-column
            label="参数"
            width="300"
          >
            <template #default="{ row }">
              <div v-if="row.inputSchema && row.inputSchema.properties && Object.keys(row.inputSchema.properties).length > 0">
                <el-tag
                  v-for="(param, key) in row.inputSchema.properties"
                  :key="key"
                  size="small"
                  class="param-tag"
                >
                  {{ key }}: {{ param.type || 'unknown' }}
                  <span
                    v-if="param.description"
                    class="param-desc"
                  >
                    ({{ param.description }})
                  </span>
                </el-tag>
              </div>
              <span
                v-else
                class="text-muted"
              >无参数</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="showToolsDialog = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  ElButton,
  ElCard,
  ElTag,
  ElEmpty,
  ElDescriptions,
  ElDescriptionsItem,
  ElCollapse,
  ElCollapseItem,
  ElTable,
  ElTableColumn,
  ElMessageBox,
  ElMessage,
  ElSwitch,
} from 'element-plus';
import { mcpService } from '../services/mcp';
import type { MCPServerConfig, ServerStatus } from '../services/mcp';
import { type Tool } from '@modelcontextprotocol/sdk/types.js';
import MCPServerEditor from '../components/MCPServerEditor.vue';

// 扩展服务器状态接口，添加折叠状态
interface ExtendedServerStatus extends ServerStatus {
  expanded?: string[];
  showDetails?: string[];
}

const servers = ref<ExtendedServerStatus[]>([]);
const serverTools = ref<Tool[]>([]);
const showAddServerDialog = ref(false);
const showToolsDialog = ref(false);
const currentServerName = ref('');
const editServerName = ref<string>();
const editServerConfig = ref<MCPServerConfig>();

// 加载服务器列表
const loadServers = async () => {
  try {
    const serverList = await mcpService.getAllServers();
    servers.value = serverList.map(server => ({
      ...server,
      expanded: [],
      showDetails: [],
    }));

    // 自动加载已连接服务器的工具
    const connectedServers = servers.value.filter(server => server.status?.connected && !server.config.disabled);

    // 并行获取所有已连接服务器的工具
    await Promise.all(connectedServers.map(server => loadServerTools(server.name)));
  } catch (error) {
    console.error('Failed to load servers:', error);
  }
};


// 删除服务器
const removeServer = async (name: string) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除服务器 "${name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );

    await mcpService.removeServer(name);
    await loadServers();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to remove server:', error);
    }
  }
};

// 切换服务器连接状态
const toggleServerStatus = async (name: string) => {
  try {
    const server = servers.value.find(s => s.name === name);
    if (!server) return;

    if (server.status?.connected) {
      await mcpService.disconnectServer(name);
    } else {
      await mcpService.connectServer(name);
    }

    await loadServers();
  } catch (error) {
    console.error('Failed to toggle server status:', error);
  }
};

// 切换服务器禁用状态
const toggleServerDisabled = async (name: string) => {
  try {
    const server = servers.value.find(s => s.name === name);
    if (!server) return;

    const newConfig = { ...server.config, disabled: !server.config.disabled };
    await mcpService.updateServer(name, newConfig);

    await loadServers();
  } catch (error) {
    console.error('Failed to toggle server disabled status:', error);
  }
};

// 加载服务器工具（内部方法，不显示消息）
const loadServerTools = async (name: string) => {
  try {
    const serverIndex = servers.value.findIndex(s => s.name === name);
    if (serverIndex === -1) return;

    const tools = await mcpService.getServerTools(name);

    // 更新服务器数据
    servers.value[serverIndex].tools = tools.map(item => ({ name: item.name, description: item.description }));
  } catch (error) {
    console.error(`Failed to load tools for server ${name}:`, error);
    // 设置空数组以避免显示加载状态
    const serverIndex = servers.value.findIndex(s => s.name === name);
    if (serverIndex !== -1) {
      servers.value[serverIndex].tools = [];
    }
  }
};

// 刷新服务器工具
const refreshServerTools = async (name: string) => {
  try {
    await loadServerTools(name);
    const server = servers.value.find(s => s.name === name);
    const tools = server?.tools || [];

    if (tools.length > 0) {
      ElMessage.success(`已加载 ${tools.length} 个工具`);
    } else {
      ElMessage.info('该服务器暂无可用工具');
    }
  } catch (error) {
    console.error('Failed to refresh server tools:', error);
  }
};

// 查看服务器工具详情
const viewServerTools = async (name: string) => {
  try {
    currentServerName.value = name;
    serverTools.value = await mcpService.getServerTools(name);
    showToolsDialog.value = true;
  } catch (error) {
    console.error('Failed to get server tools:', error);
  }
};


// 编辑服务器
const editServer = (name: string) => {
  const server = servers.value.find(s => s.name === name);
  if (!server) return;

  editServerName.value = name;
  editServerConfig.value = server.config;
  showAddServerDialog.value = true;
};


onMounted(() => {
  loadServers();
});
</script>

<style scoped lang="scss">
.mcp-config-container {
  padding: 48px 20px 20px 20px;
  width: 100%;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h2 {
    margin: 0;
    color: #333;
  }
}

.servers-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.server-card {
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .server-collapse {
    border: none;

    :deep(.el-collapse-item__header) {
      padding: 0;
      border: none;
      height: auto;
      line-height: normal;
    }

    :deep(.el-collapse-item__content) {
      padding: 0 0 0 20px;
      border: none;
    }
  }

  .server-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 16px 20px;
    background-color: #f8f9fa;
    border-radius: 8px;
    transition: all 0.3s;

    &:hover {
      background-color: #e9ecef;
    }

    .server-info {
      display: flex;
      align-items: center;
      gap: 12px;

      h3 {
        margin: 0;
        font-size: 16px;
        color: #333;
        font-weight: 600;
      }
    }

    .server-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .el-switch {
        --el-switch-on-color: #67c23a;
        --el-switch-off-color: #f56c6c;
        --el-switch-font-size: 12px;
      }
    }
  }

  .server-content {
    padding: 16px 0 0 0;

    .server-controls {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 6px;
    }

    .server-tools {
      margin: 0 0 16px 0;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 6px;

      .tools-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .tools-title {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
      }

      .tools-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .tool-tag {
          background-color: #e1f5fe;
          color: #0277bd;
          border: 1px solid #81d4fa;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background-color: #b3e5fc;
            transform: translateY(-1px);
          }
        }
      }

      .no-tools {
        text-align: center;
        padding: 16px;

        .text-muted {
          color: #666;
          font-size: 13px;
        }
      }
    }

    .tech-details {
      border: none;

      :deep(.el-collapse-item__header) {
        font-size: 12px;
        color: #666;
        background-color: #f5f5f5;
        padding: 8px 12px;
        border-radius: 4px;
      }

      :deep(.el-collapse-item__content) {
        padding: 12px;
      }
    }
  }
}


.env-display {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  .env-tag {
    background-color: #fff3e0;
    color: #e65100;
    border: 1px solid #ffcc80;
    font-family: monospace;
    font-size: 11px;
  }
}

.param-tag {
  margin: 2px;

  .param-desc {
    font-size: 11px;
    color: #666;
  }
}

.text-muted {
  color: #666;
  font-size: 13px;
}

// Dark mode styles
@media (prefers-color-scheme: dark) {
  .mcp-config-container {
    .page-header h2 {
      color: #ffffff;
    }
  }

  .server-card {
    background-color: #1e1e1e;
    border-color: #444;

    .server-title {
      background-color: #2a2a2a;

      &:hover {
        background-color: #333;
      }

      .server-info h3 {
        color: #ffffff;
      }
    }

    .server-content {
      .server-controls {
        background-color: #2a2a2a;
      }

      .server-tools {
        background-color: #2a2a2a;

        .tools-header .tools-title {
          color: #ffffff;
        }

        .tools-list .tool-tag {
          background-color: #1e3a5f;
          color: #64b5f6;
          border-color: #42a5f5;

          &:hover {
            background-color: #1565c0;
          }
        }

        .no-tools .text-muted {
          color: #aaa;
        }
      }

      .tech-details {
        :deep(.el-collapse-item__header) {
          background-color: #2a2a2a;
          color: #aaa;
        }
      }
    }
  }

  .param-tag .param-desc {
    color: #ccc;
  }

  .text-muted {
    color: #aaa;
  }
}
</style>
