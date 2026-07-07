<template>
  <PublicLayout
    :right-action-panel="rightActionPanel"
    :main-action="mainAction"
  >
    <div
      v-if="!pluginList.length"
      class="empty-state"
    >
      <UIcon
        name="i-lucide-wrench"
        class="empty-icon"
      />
      <p class="empty-text">
        暂无开发中的插件
      </p>
      <p class="empty-hint">
        使用「创建插件」命令创建新插件，或「加载开发插件」加载已有插件目录
      </p>
    </div>
    <ResultView
      v-else
      :results="resultItems"
      @enter="onEnter"
      @select="onSelect"
    />
  </PublicLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PublicLayout from '@/components/PublicLayout.vue';
import ResultView from '@/components/ResultView.vue';
import type { IResultItem } from '@public-tauri/schema';
import type { ActionPanelAction, IRunningPlugin } from '@/types/plugin';
import { getDevPluginPaths, uninstallDevPlugin } from '@/services/store';
import { showToast } from '@/utils/feedback';
import { opener } from '@public-tauri/core';
import { onPageEnter } from '@/router';

interface DevPluginInfo {
  path: string;
  name: string;
  title: string;
  subtitle: string;
  icon: string;
  loaded: boolean;
}

const pluginList = ref<DevPluginInfo[]>([]);
const selectedPlugin = ref<DevPluginInfo | null>(null);

const loadPluginList = async () => {
  const paths = await getDevPluginPaths();
  const { getPlugins } = await import('@/plugin/manager');
  const allPlugins = getPlugins({ includeDisabledPlugins: true, includeDisabledCommands: true });

  const list: DevPluginInfo[] = [];
  for (const pluginPath of paths) {
    let found: IRunningPlugin | undefined;
    for (const [, p] of allPlugins) {
      if (p.path === pluginPath) {
        found = p;
        break;
      }
    }
    list.push({
      path: pluginPath,
      name: found?.manifest.name || pluginPath.split('/').pop() || pluginPath,
      title: found?.manifest.title || pluginPath.split('/').pop() || '未知插件',
      subtitle: found ? (found.manifest.subtitle || pluginPath) : `未加载 · ${pluginPath}`,
      icon: found?.manifest.icon || 'extension',
      loaded: !!found,
    });
  }
  pluginList.value = list;
};

const resultItems = computed<IResultItem[]>(() => pluginList.value.map(p => ({
  title: p.title,
  subtitle: p.subtitle,
  icon: p.icon,
})));

const onSelect = (item: IResultItem | null, index: number) => {
  selectedPlugin.value = item ? pluginList.value[index] : null;
};

const onEnter = (_item: IResultItem, index: number) => {
  const plugin = pluginList.value[index];
  if (plugin) {
    opener.openPath(plugin.path);
  }
};

const reloadPlugin = async () => {
  if (!selectedPlugin.value) return;
  const plugin = selectedPlugin.value;
  try {
    const { reloadPluginFromLocalPath } = await import('@/plugin/manager');
    await reloadPluginFromLocalPath(plugin.path);
    await showToast(`已重新加载: ${plugin.title}`);
    await loadPluginList();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await showToast(`重新加载失败: ${msg}`);
  }
};

const openInFinder = () => {
  if (!selectedPlugin.value) return;
  opener.openPath(selectedPlugin.value.path);
};

const unloadPlugin = async () => {
  if (!selectedPlugin.value) return;
  const plugin = selectedPlugin.value;
  try {
    await uninstallDevPlugin(plugin.path);
    await showToast(`已卸载: ${plugin.title}`);
    selectedPlugin.value = null;
    await loadPluginList();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await showToast(`卸载失败: ${msg}`);
  }
};

const mainAction = computed<ActionPanelAction | undefined>(() => {
  if (!selectedPlugin.value) return undefined;
  return {
    name: 'open',
    title: '在 Finder 中打开',
    icon: 'folder_open',
    action: openInFinder,
  };
});

const rightActionPanel = computed(() => {
  if (!selectedPlugin.value) return undefined;
  const actions: ActionPanelAction[] = [
    { name: 'reload', title: '重新加载', icon: 'refresh', action: reloadPlugin },
    { name: 'open', title: '在 Finder 中打开', icon: 'folder_open', action: openInFinder },
    { name: 'unload', title: '卸载', icon: 'remove_circle_outline', styleType: 'warning', action: unloadPlugin },
  ];
  return { title: '操作', actions };
});

onMounted(loadPluginList);
onPageEnter(loadPluginList);
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--text-secondary-color);
  opacity: 0.4;
}

.empty-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary-color);
  margin-top: 12px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-secondary-color);
  margin-top: 6px;
  text-align: center;
  max-width: 280px;
  line-height: 1.5;
}
</style>
