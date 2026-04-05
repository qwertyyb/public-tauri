<template>
  <div class="settings-view">
    <ul class="panel-list">
      <li
        v-for="(label, keyName) in views"
        :key="keyName"
        class="panel-item"
        :class="{
          'active': curView === keyName,
        }"
        @click="curView=keyName"
      >
        {{ label }}
      </li>
    </ul>
    <div class="settings-view-main flex-1 h-full overflow-auto">
      <div
        v-if="curView === 'common'"
        class="settings-panel"
      >
        <el-form label-width="180px">
          <el-form-item label="开机启动">
            <el-switch
              v-model="settings.launchAtLogin"
              :active-value="true"
              :inactive-value="false"
              @change="onLaunchAtLoginChange"
            />
          </el-form-item>
          <el-form-item label="快捷键">
            <ShortcutsRecorder
              v-model="settings.shortcuts"
              size="large"
              class="main-shortcuts"
              @update:model-value="onShortcutsChange"
            />
          </el-form-item>
          <el-form-item label="清除超时">
            <div class="w-64">
              <el-select
                v-model="settings.clearTimeout"
                style="width:200px"
                @change="onClearTimeoutChange"
              >
                <el-option
                  :value="0"
                  label="即时"
                />
                <el-option
                  :value="5"
                  label="5 秒后"
                />
                <el-option
                  :value="30"
                  label="30 秒后"
                />
                <el-option
                  :value="90"
                  label="90 秒后"
                />
                <el-option
                  :value="180"
                  label="3 分钟后"
                />
                <el-option
                  :value="600"
                  label="10 分钟后"
                />
                <el-option
                  :value="-1"
                  label="永不"
                />
              </el-select>
            </div>
          </el-form-item>
        </el-form>
      </div>
      <div
        v-else-if="curView==='plugins'"
        class="settings-panel"
      >
        <div class="panel-header">
          插件管理
          <el-button
            :icon="Plus"
            circle
            size="small"
            @click="onAddPluginClick"
          />
        </div>
        <ul class="plugin-list">
          <li
            v-for="(plugin, index) in plugins"
            :key="plugin.path"
            class="plugin-item"
          >
            <div class="plugin-item-self">
              <el-icon
                class="plugin-expand-icon"
                :size="14"
                :class="{ expanded: expand[plugin.manifest.name], hidden: plugin.commands.length <= 0 }"
                @click="onExpandPluginClick(plugin)"
              >
                <ArrowRightBold />
              </el-icon>
              <img
                :src="plugin.manifest.icon"
                alt=""
                class="plugin-icon"
              >
              <div class="plugin-info">
                <h3 class="plugin-title">
                  {{ plugin.manifest.title }}
                </h3>
                <p class="plugin-subtitle">
                  {{ plugin.manifest.subtitle }}
                </p>
              </div>
              <el-button
                v-if="plugin.manifest.preferences?.length"
                :icon="Operation"
                circle
                class="action-item"
                size="small"
                @click="openPrfsView(plugin.manifest.name)"
              />
              <el-button
                type="danger"
                :icon="Delete"
                size="small"
                class="action-item"
                circle
                @click="onRemovePluginClick(index, plugin)"
              />
              <el-switch
                class="action-item"
                :model-value="plugin.settings?.disabled !== true"
                @update:model-value="onPluginDisabledChange($event as boolean, plugin)"
              />
            </div>
            <ul
              v-if="expand[plugin.manifest.name]"
              class="command-list"
            >
              <li
                v-for="command in plugin.commands"
                :key="command.name"
                class="command-item"
              >
                <img
                  :src="command.icon"
                  alt=""
                  class="command-icon"
                >
                <div class="command-info">
                  <h3 class="command-title">
                    {{ command.title }}
                  </h3>
                  <h5 class="command-subtitle">
                    {{ command.subtitle }}
                  </h5>
                </div>
                <div class="action-item">
                  <el-input
                    size="small"
                    placeholder="别名"
                    :model-value="plugin.settings?.commands?.[command.name]?.alias ?? ''"
                    @update:model-value="onCommandChange({ alias: $event }, plugin, command)"
                  />
                </div>
                <div class="action-item">
                  <ShortcutsRecorder
                    :model-value="plugin.settings?.commands?.[command.name]?.shortcut ?? ''"
                    @update:model-value="onCommandChange({ shortcut: $event }, plugin, command)"
                  />
                </div>
                <div class="action-item">
                  <el-switch
                    :model-value="!plugin.settings?.commands?.[command.name]?.disabled"
                    size="small"
                    @update:model-value="onCommandChange({ disabled: !$event }, plugin, command)"
                  />
                </div>
              </li>
            </ul>
          </li>
        </ul>
      </div>
      <div
        v-else-if="curView==='links'"
        class="settings-panel"
      >
        <div class="panel-header">
          快捷链接
          <el-button
            :icon="Plus"
            circle
            size="small"
            @click="createLink"
          />
        </div>
        <ul class="link-list">
          <li
            v-for="(item, index) in links"
            :key="index"
            class="link-item flex justify-between items-center"
          >
            <h3 class="link-title">
              {{ item.title }}
            </h3>
            <el-button
              type="danger"
              :icon="Delete"
              size="small"
              class="action-item"
              circle
              @click="removeLink(index)"
            />
          </li>
        </ul>
      </div>
      <div
        v-else-if="curView==='mcp'"
        class="settings-panel"
      >
        <div class="panel-header">
          MCP 服务器配置
          <el-button
            type="primary"
            @click="openMCPConfig"
          >
            管理服务器
          </el-button>
        </div>
        <div class="mcp-description">
          <p>Model Context Protocol (MCP) 允许 AI 助手连接到外部工具和服务。</p>
          <p>您可以在这里配置和管理 MCP 服务器连接。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRaw } from 'vue';
import { ElMessage, ElButton, ElSelect, ElSwitch, ElOption, ElInput, ElForm, ElFormItem, ElIcon } from 'element-plus';
import { ArrowRightBold, Plus, Delete, Operation } from '@element-plus/icons-vue';
import ShortcutsRecorder from '@/components/HotkeyRecorder.vue';
import type { ICommand as IPluginCommand } from '@public/schema';
import type { IRunningPlugin, ICommandSettings } from '@/types/plugin';
import { getSettings, updateSettings, getPlugins, updateMainShortcut } from '@/services/settings';
import { onPageEnter, useRouter } from '@/router';
import { unregisterPlugin, updateCommandSettings, updateCommandShortcut, updatePluginPreferences, updatePluginSettings } from '@/plugin/manager';
import { openCommandPreferences, openPluginPreferences } from '@/plugin/utils';

const views = ref({
  common: '通用',
  plugins: '插件设置',
  links: '快捷链接',
  mcp: 'MCP 配置',
});
const curView = ref('common');

const plugins = ref<IRunningPlugin[]>([]);

const settings = ref<{
  launchAtLogin: boolean,
  shortcuts: string,
  clearTimeout: number,
}>({
  launchAtLogin: false,
  shortcuts: '',
  clearTimeout: 90,
});
const expand = ref<Record<string, boolean | undefined>>({});

interface ILink {
  trigger: string
  title: string
  link: string
}

const links = computed(() => plugins.value.find(i => i.manifest.name === 'links')?.settings?.preferences?.links as unknown as ILink[] || []);

const refreshSettings = async () => {
  getSettings()?.then((data: any) => {
    settings.value = {
      ...settings.value,
      ...data,
    };
    console.log('settings.value', settings.value);
  });
  getPlugins()?.then((data: IRunningPlugin[]) => {
    plugins.value = data;
  });
};
const onLaunchAtLoginChange = async (launchAtLogin: any) => {
  settings.value.launchAtLogin = !!launchAtLogin;
  await updateSettings({ launchAtLogin: settings.value.launchAtLogin });
  refreshSettings();
};
const onShortcutsChange = async (shortcuts: string) => {
  updateMainShortcut(shortcuts);
  settings.value.shortcuts = shortcuts;
  await updateSettings({ shortcuts: settings.value.shortcuts });
  refreshSettings();
};
const onClearTimeoutChange = async () => {
  await updateSettings({ clearTimeout: settings.value.clearTimeout });
  refreshSettings();
};
const onPluginDisabledChange = async (enabled: boolean, plugin: IRunningPlugin) => {
  console.log('plugin enabled', enabled);
  // eslint-disable-next-line no-param-reassign
  plugin.settings = { ...plugin.settings!, disabled: !enabled };
  await updatePluginSettings(plugin.manifest.name, { disabled: !enabled });
  refreshSettings();
};
const onCommandChange = async (values: Partial<ICommandSettings>, plugin: IRunningPlugin, command: IPluginCommand) => {
  if ('shortcut' in values) {
    updateCommandShortcut(plugin.manifest.name, command.name, values.shortcut);
    return;
  }
  // eslint-disable-next-line no-param-reassign
  plugin.settings!.commands![command.name] = { ...plugin.settings!.commands![command.name], ...values };
  await updateCommandSettings(plugin.manifest.name, command.name, { ...values });
  refreshSettings();
};

const onExpandPluginClick = (plugin: IRunningPlugin) => {
  expand.value = {
    ...expand.value,
    [plugin.manifest.name]: !expand.value[plugin.manifest.name],
  };
};
const onAddPluginClick = async () => {
  const file = await new Promise<File>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) reject(new Error('no file selected'));
      resolve(file!);
    };
    input.click();
  });

  const validateFile = (_file: File) => {
    // @todo
    ElMessage.error('待实现');
    throw new Error('未实现');
  };

  validateFile(file);

  // await window.window.PublicAppBridge.invoke('registerPlugin', { path: file.path })
  ElMessage.success('插件添加成功');
  refreshSettings();
};

const onRemovePluginClick = async (_index: number, plugin: IRunningPlugin) => {
  await unregisterPlugin(plugin.manifest.name);
  ElMessage.success('插件移除成功');
  refreshSettings();
};

const openPrfsView = async (plugin: string, command?: string) => {
  if (plugin === 'links') {
    curView.value = 'links';
    return;
  }
  command ? openCommandPreferences(plugin, command) : openPluginPreferences(plugin);
};

const router = useRouter();

const createLink = () => {
  console.log('router', router);
  router?.pushView('/plugin/link/create');
};

const openMCPConfig = () => {
  router?.pushView('/mcp/config');
};

const removeLink = async (index: number) => {
  const preferences = plugins.value.find(i => i.manifest.name === 'links')?.settings?.preferences;
  const newLinks = [...toRaw(links.value.filter((_, i) => i !== index))];
  await updatePluginPreferences('links', { ...toRaw(preferences), links: newLinks });
  refreshSettings();
};

onPageEnter(() => {
  refreshSettings();
});

</script>

<style lang="scss" scoped>
.settings-view {
  --nav-width: 36px;
  --nav-height: 48px;
  height: 100vh;
  padding-top: var(--nav-height);
  box-sizing: border-box;
  display: flex;
}
.panel-list, .settings-view-main {
  height: 100%;
}
.panel-list {
  width: 200px;
  text-align: center;
  border-right: 1px solid var(--border-color);
  .panel-item {
    height: 42px;
    line-height: 42px;
    transition: background-color .2s;
    cursor: pointer;
    &.active {
      background-color: var(--selected-bg-color);
    }
  }
}
.settings-view-main {
  overflow: auto;
}
.settings-panel {
  height: 100%;
  .main-shortcuts {
    background: rgba(0, 0, 0, 0.15);
    &:deep(.keyboard-key) {
      background: none;
      font-size: 20px;
    }
  }
  .panel-header {
    height: 42px;
    background: rgba(0, 128, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
  }

  .mcp-description {
    padding: 16px;
    p {
      margin: 8px 0;
      line-height: 1.5;
      color: #666;
      font-size: 14px;
    }
  }
  .plugin-item-self, .command-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
  }
  .plugin-expand-icon {
    transition: transform .2s;
    &.hidden {
      visibility: hidden;
    }
  }
  .plugin-expand-icon.expanded {
    transform: rotate(90deg);
  }
  .plugin-icon, .command-icon {
    width: 32px;
    height: 32px;
    margin-left: 8px;
  }
  .plugin-info, .command-info {
    margin-left: 12px;
    margin-right: auto;
  }
  .plugin-title, .command-title {
    font-size: 14px;
    font-weight: 500;
  }
  .plugin-subtitle, .command-subtitle {
    margin-top: 4px;
    font-size: 12px;
    opacity: 0.4;
    font-weight: 500;
  }
  .action-item + .action-item {
    margin-left: 12px;
  }
  .command-list {
    margin-left: 14px;
  }
}

.link-item {
  height: 48px;
  padding: 8px 16px;
  &:nth-child(even) {
    background: rgba(255, 255, 255, .03);
  }
  .link-title {
    font-size: 14px;
    font-weight: 500;
  }
}
</style>
