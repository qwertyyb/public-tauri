<template>
  <ul class="plugin-list">
    <template
      v-for="(plugin, index) in plugins"
      :key="plugin.path + plugin.manifest.name"
    >
      <li class="plugin-item">
        <div class="plugin-item-self">
          <div class="plugin-expand-icon-wrapper">
            <UIcon
              :name="expand[plugin.manifest.name] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              class="plugin-expand-icon"
              :class="{ hidden: plugin.commands.length <= 0 }"
              @click="onExpandPluginClick(plugin)"
            />
          </div>
          <AppIcon
            :icon="plugin.manifest.icon"
            :size="24"
            class="plugin-icon"
          />
          <div class="plugin-info">
            <h3 class="plugin-title flex items-center">
              {{ plugin.manifest.title }}
              <UBadge
                v-if="isPathInDevList(plugin.path)"
                size="xs"
                color="warning"
                class="dev-plugin-tag"
              >
                开发
              </UBadge>
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
            v-if="canRemovePlugin(plugin)"
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            class="action-item"
            @click="onRemovePluginClick(index, plugin)"
          />
          <USwitch
            size="xs"
            class="action-item"
            :model-value="plugin.settings?.disabled !== true"
            @update:model-value="onPluginDisabledChange($event as boolean, plugin)"
          />
        </div>
      </li>

      <template
        v-if="expand[plugin.manifest.name]"
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
              size="xs"
              placeholder="别名"
              variant="outline"
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
              size="xs"
              :model-value="!plugin.settings?.commands?.[command.name]?.disabled"
              @update:model-value="onCommandChange({ disabled: !$event }, plugin, command)"
            />
          </div>
        </li>
      </template>
    </template>
  </ul>
</template>

<script setup lang="ts">
import AppIcon from '@public-tauri/icon/AppIcon.vue';
import ShortcutsRecorder from '@/components/HotkeyRecorder.vue';
import type { ICommandSettings, IRunningPlugin } from '@/types/plugin';
import { updateCommandSettings, updateCommandShortcut, updatePluginSettings } from '@/plugin/manager';
import type { ICommand as IPluginCommand } from '@public-tauri/schema';
import { openCommandPreferences, openPluginPreferences } from '@/plugin/utils';
import { ref } from 'vue';
import { INNER_PLUGIN_NAMES } from '@/plugin/constants';
import { showToast } from '@/utils/feedback';
import { BUILTIN_PLUGINS } from '@/plugin/builtin';
import { isPluginPathInRaycastList, isPluginPathInStoreList, uninstallRaycastStorePlugin, uninstallStorePlugin } from '@/services/store';
import { storage } from '@public-tauri/core';
import { isPluginPathInDevList, uninstallDevPlugin } from '@/services/developer';
import { STORAGE_KEY } from '@/const';

defineProps<{
  plugins: IRunningPlugin[];
}>();

const emits = defineEmits<{
  changed: [];
}>();


const expand = ref<Record<string, boolean | undefined>>({});
const devPluginPathList = ref<string[]>([]);

storage.getItem(STORAGE_KEY.DEV_PLUGIN_PATH_LIST).then((list: string[]) => {
  devPluginPathList.value = list || [];
});

const isPathInDevList = (p: string) => Boolean(p) && devPluginPathList.value.some(d => d === p);

const isBuiltinPlugin = (plugin: IRunningPlugin) => BUILTIN_PLUGINS.has(plugin.manifest.name)
  || (INNER_PLUGIN_NAMES as readonly string[]).includes(plugin.manifest.name);
const canRemovePlugin = (plugin: IRunningPlugin) => !isBuiltinPlugin(plugin);

const onPluginDisabledChange = async (enabled: boolean, plugin: IRunningPlugin) => {
  // eslint-disable-next-line no-param-reassign
  plugin.settings = { ...plugin.settings!, disabled: !enabled };
  await updatePluginSettings(plugin.manifest.name, { disabled: !enabled });
  emits('changed');
};
const onCommandChange = async (values: Partial<ICommandSettings>, plugin: IRunningPlugin, command: IPluginCommand) => {
  if ('shortcut' in values) {
    updateCommandShortcut(plugin.manifest.name, command.name, values.shortcut);
    return;
  }
  // eslint-disable-next-line no-param-reassign
  plugin.settings!.commands![command.name] = { ...plugin.settings!.commands![command.name], ...values };
  await updateCommandSettings(plugin.manifest.name, command.name, { ...values });
  emits('changed');
};

const onExpandPluginClick = (plugin: IRunningPlugin) => {
  expand.value = {
    ...expand.value,
    [plugin.manifest.name]: !expand.value[plugin.manifest.name],
  };
};

const onRemovePluginClick = async (_index: number, plugin: IRunningPlugin) => {
  if (isBuiltinPlugin(plugin)) {
    showToast('内置插件无法从此处移除');
    return;
  }
  const { path, manifest } = plugin;
  if (await isPluginPathInDevList(path)) {
    await uninstallDevPlugin(path);
    showToast('已移除开发插件');
    emits('changed');
    return;
  }
  if (await isPluginPathInStoreList(path)) {
    await uninstallStorePlugin(manifest.name);
    showToast('插件移除成功');
    emits('changed');
    return;
  }
  if (await isPluginPathInRaycastList(path)) {
    await uninstallRaycastStorePlugin(manifest.name);
    showToast('插件移除成功');
    emits('changed');
    return;
  }
  if (path) {
    await uninstallDevPlugin(path);
    showToast('插件已移除');
    emits('changed');
    return;
  }
  showToast('无法移除此插件');
};

const openPrfsView = async (plugin: string, command?: string) => {
  if (command) {
    await openCommandPreferences(plugin, command);
  } else {
    openPluginPreferences(plugin);
  }
};

</script>

<style lang="scss" scoped>
.plugin-list > *:nth-child(even) {
  background: light-dark(rgba(0, 0, 0, 0.05), rgba(184, 184, 184, 0.1));
}
.plugin-item-self, .command-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
}
.dev-plugin-tag {
  margin-left: 6px;
}
.command-item {
  padding-left: 44px;
}
.plugin-expand-icon-wrapper {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  width: 24px;
  height: 24px;
  margin-left: 6px;
  flex-shrink: 0;
}
.plugin-info, .command-info {
  margin-left: 12px;
  margin-right: auto;
}
.plugin-title, .command-title {
  font-size: 13px;
  font-weight: 500;
}
.plugin-subtitle, .command-subtitle {
  font-size: 11px;
  opacity: 0.4;
  font-weight: 500;
  // 最多显示两行文本
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.action-item + .action-item {
  margin-left: 12px;
}
.command-list {
  margin-left: 14px;
}
</style>
