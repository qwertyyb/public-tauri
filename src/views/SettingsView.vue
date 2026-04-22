<template>
  <PublicLayout>
    <div class="settings-body">
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
      <div class="settings-view-main">
        <div
          v-if="curView === 'common'"
          class="settings-panel"
        >
          <div class="form-section">
            <div class="form-row">
              <span class="form-label">外观模式</span>
              <USelect
                v-model="colorMode"
                :items="colorModeOptions"
                class="w-48"
              />
            </div>
            <div class="form-row">
              <span class="form-label">开机启动</span>
              <USwitch
                v-model="settings.launchAtLogin"
                @update:model-value="onLaunchAtLoginChange"
              />
            </div>
            <div class="form-row">
              <span class="form-label">快捷键</span>
              <ShortcutsRecorder
                v-model="settings.shortcuts"
                size="large"
                class="main-shortcuts"
                @update:model-value="onShortcutsChange"
              />
            </div>
            <div class="form-row">
              <span class="form-label">清除超时</span>
              <USelect
                v-model="settings.clearTimeout"
                :items="clearTimeoutOptions"
                class="w-48"
                @update:model-value="onClearTimeoutChange"
              />
            </div>
          </div>
        </div>
        <div
          v-else-if="curView==='plugins'"
          class="settings-panel"
        >
          <div class="panel-header">
            插件管理
            <UButton
              icon="i-lucide-plus"
              variant="ghost"
              color="neutral"
              size="xs"
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
                <UIcon
                  :name="expand[plugin.manifest.name] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                  class="plugin-expand-icon"
                  :class="{ hidden: plugin.commands.length <= 0 }"
                  @click="onExpandPluginClick(plugin)"
                />
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
                <UButton
                  v-if="plugin.manifest.preferences?.length"
                  icon="i-lucide-settings"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="action-item"
                  @click="openPrfsView(plugin.manifest.name)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="error"
                  size="xs"
                  class="action-item"
                  @click="onRemovePluginClick(index, plugin)"
                />
                <USwitch
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
                    <UInput
                      size="sm"
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
                    <USwitch
                      :model-value="!plugin.settings?.commands?.[command.name]?.disabled"
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
            <UButton
              icon="i-lucide-plus"
              variant="ghost"
              color="neutral"
              size="xs"
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
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="xs"
                class="action-item"
                @click="removeLink(index)"
              />
            </li>
          </ul>
        </div>
      </div>
    </div>
  </PublicLayout>
</template>

<script lang="ts" setup>
import { computed, ref, toRaw, watch } from 'vue';
import { useColorMode } from '@vueuse/core';
import PublicLayout from '@/components/PublicLayout.vue';
import ShortcutsRecorder from '@/components/HotkeyRecorder.vue';
import type { ICommand as IPluginCommand } from '@public/schema';
import type { IRunningPlugin, ICommandSettings } from '@/types/plugin';
import { getSettings, updateSettings, getPlugins, updateMainShortcut } from '@/services/settings';
import { onPageEnter, useRouter } from '@/router';
import { updateCommandSettings, updateCommandShortcut, updatePluginPreferences, updatePluginSettings } from '@/plugin/manager';
import { openCommandPreferences, openPluginPreferences } from '@/plugin/utils';
import { uninstallStorePlugin } from '@/services/store';
import { showToast } from '@/utils/feedback';

const colorModeState = useColorMode({
  attribute: 'class',
  modes: {
    dark: 'dark',
    light: 'light',
  },
});
const colorMode = ref(colorModeState.store.value);
const colorModeOptions = [
  { value: 'auto', label: '跟随系统' },
  { value: 'light', label: '浅色模式' },
  { value: 'dark', label: '深色模式' },
];

watch(colorMode, (val) => {
  colorModeState.store.value = val;
});

const views = ref({
  common: '通用',
  plugins: '插件设置',
  links: '快捷链接',
});
const curView = ref('common');

const clearTimeoutOptions = [
  { value: 0, label: '即时' },
  { value: 5, label: '5 秒后' },
  { value: 30, label: '30 秒后' },
  { value: 90, label: '90 秒后' },
  { value: 180, label: '3 分钟后' },
  { value: 600, label: '10 分钟后' },
  { value: -1, label: '永不' },
];

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
    showToast('待实现');
    throw new Error('未实现');
  };

  validateFile(file);

  // await window.window.PublicAppBridge.invoke('registerPlugin', { path: file.path })
  showToast('插件添加成功');
  refreshSettings();
};

const onRemovePluginClick = async (_index: number, plugin: IRunningPlugin) => {
  await uninstallStorePlugin(plugin.manifest.name);
  showToast('插件移除成功');
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
.settings-body {
  display: flex;
  height: 100%;
}
.panel-list {
  flex-shrink: 0;
  width: 200px;
  border-right: 1px solid var(--divider-color);
  .panel-item {
    padding: 0 16px;
    height: 42px;
    line-height: 42px;
    text-align: center;
    transition: background-color .2s;
    cursor: pointer;
    &.active {
      background-color: var(--selected-bg-color);
    }
  }
}
.settings-view-main {
  flex: 1;
  overflow: auto;
}
.settings-panel {
  .form-section {
    padding: 16px 24px;
  }
  .form-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 42px;
    padding: 8px 0;
  }
  .form-label {
    font-size: 14px;
    font-weight: 500;
    flex-shrink: 0;
    min-width: 100px;
  }
  .main-shortcuts {
    background: rgba(0, 0, 0, 0.15);
    &:deep(.keyboard-key) {
      background: none;
      font-size: 20px;
    }
  }
  .panel-header {
    height: 42px;
    background: color-mix(in srgb, var(--ui-primary) 20%, transparent);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
  }

  .plugin-item-self, .command-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
  }
  .plugin-expand-icon {
    transition: transform .2s;
    cursor: pointer;
    flex-shrink: 0;
    &.hidden {
      visibility: hidden;
    }
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
