<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEditMode ? '编辑 MCP 服务器' : '添加 MCP 服务器'"
    width="80vw"
    height="400px"
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="resetForm"
  >
    <el-form
      ref="serverFormRef"
      :model="serverForm"
      :rules="serverFormRules"
      label-width="100px"
    >
      <el-form-item
        label="服务器名称"
        prop="name"
      >
        <el-input
          v-model="serverForm.name"
          placeholder="请输入服务器名称"
        />
      </el-form-item>

      <el-form-item
        label="连接类型"
        prop="type"
      >
        <el-radio-group v-model="serverForm.type">
          <el-radio value="stdio">
            Stdio
          </el-radio>
          <el-radio value="http">
            HTTP
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- Stdio 配置 -->
      <template v-if="serverForm.type === 'stdio'">
        <el-form-item
          label="命令"
          prop="command"
        >
          <el-input
            v-model="serverForm.command"
            placeholder="例如: npx"
          />
        </el-form-item>
        <el-form-item label="参数">
          <div class="args-input">
            <el-input
              v-for="(_, index) in serverForm.args"
              :key="index"
              v-model="serverForm.args[index]"
              placeholder="参数"
              class="arg-item"
            >
              <template #append>
                <el-button
                  @click="removeArg(index)"
                >
                  删除
                </el-button>
              </template>
            </el-input>
            <el-button
              type="primary"
              plain
              @click="addArg"
            >
              添加参数
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="环境变量">
          <div class="env-input">
            <div
              v-for="(env, index) in serverForm.env"
              :key="index"
              class="env-item"
            >
              <el-input
                v-model="env.key"
                placeholder="变量名"
                class="env-key"
              />
              <span class="env-separator">=</span>
              <el-input
                v-model="env.value"
                placeholder="变量值"
                class="env-value"
              />
              <el-button
                type="danger"
                size="small"
                @click="removeEnv(index)"
              >
                删除
              </el-button>
            </div>
            <el-button
              type="primary"
              plain
              @click="addEnv"
            >
              添加环境变量
            </el-button>
          </div>
        </el-form-item>
      </template>

      <!-- HTTP 配置 -->
      <template v-if="serverForm.type === 'http'">
        <el-form-item
          label="URL"
          prop="url"
        >
          <el-input
            v-model="serverForm.url"
            placeholder="例如: http://localhost:3000"
          />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="handleCancel">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="submitting"
        @click="handleSubmit"
      >
        {{ isEditMode ? '更新' : '添加' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElRadioGroup,
  ElRadio,
  ElButton,
  ElMessage,
} from 'element-plus';
import type { FormInstance } from 'element-plus';
import { mcpService } from '../services/mcp';
import type { MCPServerConfig } from '../services/mcp';

interface ServerFormData {
  name: string;
  type: 'stdio' | 'http';
  command: string;
  args: string[];
  env: { key: string; value: string }[];
  url: string;
}

interface Props {
  editServerName?: string;
  serverConfig?: MCPServerConfig;
}

const props = defineProps<Props>();
const modelValue = defineModel<boolean>();
const emit = defineEmits<{
  success: [];
  'update:modelValue': [value: boolean];
}>();

const serverFormRef = ref<FormInstance>();
const serverForm = ref<ServerFormData>({
  name: '',
  type: 'stdio',
  command: '',
  args: [''],
  env: [{ key: '', value: '' }],
  url: '',
});

const serverFormRules = {
  name: [
    { required: true, message: '请输入服务器名称', trigger: 'blur' },
  ],
  type: [
    { required: true, message: '请选择连接类型', trigger: 'change' },
  ],
  command: [
    { required: true, message: '请输入命令', trigger: 'blur' },
  ],
  url: [
    { required: true, message: '请输入 URL', trigger: 'blur' },
  ],
};

const isEditMode = ref(false);
const originalServerName = ref('');
const submitting = ref(false);

// 加载服务器数据到表单
const loadServerData = (name: string, config: MCPServerConfig) => {
  serverForm.value.name = name;
  serverForm.value.type = config.type;

  if (config.type === 'stdio') {
    serverForm.value.command = config.command;
    serverForm.value.args = config.args || [''];

    // 处理环境变量
    if (config.env) {
      serverForm.value.env = Object.entries(config.env).map(([key, value]) => ({ key, value }));
    } else {
      serverForm.value.env = [{ key: '', value: '' }];
    }
  } else if (config.type === 'http') {
    serverForm.value.url = config.url;
  }
};

// 添加参数
const addArg = () => {
  serverForm.value.args.push('');
};

// 删除参数
const removeArg = (index: number) => {
  serverForm.value.args.splice(index, 1);
};

// 添加环境变量
const addEnv = () => {
  serverForm.value.env.push({ key: '', value: '' });
};

// 删除环境变量
const removeEnv = (index: number) => {
  serverForm.value.env.splice(index, 1);
};

// 重置表单数据
const resetFormData = () => {
  serverForm.value = {
    name: '',
    type: 'stdio',
    command: '',
    args: [''],
    env: [{ key: '', value: '' }],
    url: '',
  };
};

// 重置表单
const resetForm = () => {
  resetFormData();
  isEditMode.value = false;
  originalServerName.value = '';
  serverFormRef.value?.resetFields();
};

// 处理取消
const handleCancel = () => {
  modelValue.value = false;
};

// 处理提交
const handleSubmit = async () => {
  if (!serverFormRef.value) return;

  submitting.value = true;

  try {
    await serverFormRef.value.validate();

    let config: MCPServerConfig;

    if (serverForm.value.type === 'stdio') {
      // 过滤出有效的环境变量
      const envVars: Record<string, string> = {};
      serverForm.value.env.forEach((env) => {
        if (env.key.trim() && env.value.trim()) {
          envVars[env.key.trim()] = env.value.trim();
        }
      });

      config = {
        type: 'stdio',
        command: serverForm.value.command,
        args: serverForm.value.args.filter(arg => arg.trim() !== ''),
        env: Object.keys(envVars).length > 0 ? envVars : undefined,
        disabled: false,
      };
    } else {
      config = {
        type: 'http',
        url: serverForm.value.url,
        disabled: false,
      };
    }

    // 如果是编辑模式且名称改变了，需要先删除旧的服务器
    if (isEditMode.value && serverForm.value.name !== originalServerName.value) {
      await mcpService.removeServer(originalServerName.value);
    }

    await mcpService.addServer(serverForm.value.name, config);

    ElMessage.success(isEditMode.value ? '服务器更新成功' : '服务器添加成功');
    modelValue.value = false;
    emit('success');
  } catch (error) {
    console.error('Failed to save server:', error);
    ElMessage.error(isEditMode.value ? '服务器更新失败' : '服务器添加失败');
  } finally {
    submitting.value = false;
  }
};


// 监听编辑数据变化
watch([() => props.editServerName, () => props.serverConfig], ([serverName, serverConfig]) => {
  if (serverName && serverConfig) {
    isEditMode.value = true;
    originalServerName.value = serverName;
    loadServerData(serverName, serverConfig);
  } else {
    isEditMode.value = false;
    originalServerName.value = '';
    resetFormData();
  }
}, { immediate: true });
</script>

<style scoped lang="scss">
.args-input {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .arg-item {
    margin-bottom: 8px;
  }
}

.env-input {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .env-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .env-key {
      flex: 1;
      min-width: 150px;
    }

    .env-separator {
      font-weight: bold;
      color: #666;
    }

    .env-value {
      flex: 2;
      min-width: 200px;
    }
  }
}
</style>
