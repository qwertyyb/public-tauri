<template>
  <PublicLayout
    :right-action-panel="rightActionPanel"
    :main-action="mainAction"
  >
    <div class="detail-content">
      <div class="detail-header">
        <img
          v-if="iconSrc"
          :src="iconSrc"
          :alt="ext?.title"
          class="detail-icon"
        >
        <div
          v-else
          class="detail-icon detail-icon-placeholder"
        />
        <h2 class="detail-title">
          {{ ext?.title }}
        </h2>
        <p class="detail-meta">
          <span
            v-if="ext?.version"
            class="meta-version"
          >v{{ ext.version }}</span>
          <template v-if="ext?.author">
            <span class="meta-sep">·</span>
            <span class="meta-author">{{ ext.author }}</span>
          </template>
        </p>
      </div>

      <div class="detail-divider" />

      <p class="detail-description">
        {{ ext?.description }}
      </p>

      <div
        v-if="ext?.commands?.length"
        class="commands-section"
      >
        <h4 class="section-title">
          命令列表
        </h4>
        <ul class="commands-list">
          <li
            v-for="cmd in ext.commands"
            :key="cmd.name || cmd.title"
            class="command-item"
          >
            <img
              v-if="commandIcon(cmd)"
              :src="commandIcon(cmd)"
              :alt="cmd.title"
              class="command-icon"
            >
            <div
              v-else
              class="command-icon command-icon-ph"
            />
            <div class="command-info">
              <div class="command-title-row">
                <span class="command-title">{{ cmd.title }}</span>
                <span
                  v-if="raycastCommandModeLabel(cmd.mode)"
                  class="command-mode-badge"
                  :title="cmd.mode"
                >{{ raycastCommandModeLabel(cmd.mode) }}</span>
              </div>
              <span
                v-if="cmd.subtitle"
                class="command-subtitle"
              >{{ cmd.subtitle }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div class="detail-footer-info">
        <a
          v-if="ext?.storeUrl"
          href="#"
          class="footer-link"
          @click.prevent="openStoreUrl"
        >
          <span class="material-symbols-outlined stat-icon">open_in_new</span>
          Raycast 商店页
        </a>
      </div>
    </div>
  </PublicLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PublicLayout from '@/components/PublicLayout.vue';
import { type ActionPanel } from '@/components/ActionBar.vue';
import { useRouter, onPageEnter } from '@/router';
import {
  fetchRaycastStoreIndex,
  findRaycastExtensionByName,
  raycastExtensionIconUrl,
  resolveRaycastIconUrlFromSource,
  publicPluginNpmNameForRaycastExtension,
} from '@/services/raycast-store';
import type { RaycastStoreCommand, RaycastStoreExtension, RaycastStoreIndex } from '@/types/raycast-store';
import type { ActionPanelAction } from '@/types/plugin';
import {
  installRaycastStoreExtension,
  isPluginInstalled,
  isRaycastExtensionInstalling,
  refreshInstalledPlugins,
  uninstallRaycastStorePlugin,
} from '@/services/store';
import { open } from 'tauri-plugin-shellx-api';
import { showConfirm, showToast } from '@/utils/feedback';

const RAYCAST_COMMAND_MODE_LABELS: Record<string, string> = {
  view: '视图 · view',
  'no-view': '无界面 · no-view',
  'menu-bar': '菜单栏 · menu-bar',
};

/** Raycast command `mode` 展示文案；未知模式仍显示原始字符串 */
const raycastCommandModeLabel = (mode: string | undefined): string => {
  const raw = mode?.trim();
  if (!raw) return '';
  const key = raw.toLowerCase();
  return RAYCAST_COMMAND_MODE_LABELS[key] ?? raw;
};

const props = defineProps<{
  name?: string;
}>();

const router = useRouter();
const index = ref<RaycastStoreIndex | null>(null);
const ext = ref<RaycastStoreExtension | undefined>();

const iconSrc = computed(() => (ext.value && index.value ? raycastExtensionIconUrl(ext.value, index.value) : undefined));

const commandIcon = (cmd: RaycastStoreCommand): string | undefined => {
  if (!ext.value || !index.value || !cmd.icon) return iconSrc.value;
  return resolveRaycastIconUrlFromSource(cmd.icon, ext.value.source.path, index.value);
};

const publicNpm = computed(() => (ext.value ? publicPluginNpmNameForRaycastExtension(ext.value) : ''));
const installed = computed(() => (publicNpm.value ? isPluginInstalled(publicNpm.value) : false));
const installing = computed(() => (ext.value ? isRaycastExtensionInstalling(ext.value.name) : false));

const openStoreUrl = async () => {
  if (!ext.value?.storeUrl) return;
  await open(ext.value.storeUrl);
};

const runInstall = async () => {
  if (!ext.value || !index.value || installing.value) return;
  try {
    await installRaycastStoreExtension(ext.value, index.value);
    showToast('安装完成');
  } catch (err) {
    console.error(err);
    showToast(err instanceof Error ? err.message : '安装失败');
  }
};

const runUninstall = async () => {
  if (!ext.value || !publicNpm.value || !installed.value) return;
  try {
    await showConfirm(
      `确定要卸载「${ext.value.title}」吗？\n\n将从本机移除该插件及其文件。`,
      '卸载插件',
    );
  } catch {
    return;
  }
  try {
    await uninstallRaycastStorePlugin(publicNpm.value);
    showToast('已卸载');
  } catch (err) {
    console.error(err);
    showToast(err instanceof Error ? err.message : '卸载失败');
  }
};

const refreshDetail = async () => {
  await load();
};

const mainAction = computed<ActionPanelAction | undefined>(() => {
  if (!ext.value) return undefined;
  if (installed.value) {
    return {
      name: 'installed',
      title: '已安装',
      icon: 'check_circle',
      action: () => {
        router?.popView();
      },
    };
  }
  return {
    name: 'install-raycast',
    title: installing.value ? '安装中...' : '安装',
    icon: 'download',
    action: runInstall,
  };
});

const rightActionPanel = computed<ActionPanel | undefined>(() => {
  if (!ext.value) return undefined;
  const actions: ActionPanelAction[] = [];
  if (ext.value.storeUrl) {
    actions.push({
      name: 'open-raycast-store',
      title: '打开 Raycast 商店页',
      icon: 'open_in_new',
      action: openStoreUrl,
    });
  }
  actions.push({
    name: 'refresh-raycast-detail',
    title: '刷新',
    icon: 'refresh',
    action: () => {
      void refreshDetail();
    },
  });
  if (installed.value && publicNpm.value) {
    actions.push({
      name: 'uninstall-raycast',
      title: '卸载插件',
      icon: 'delete',
      styleType: 'danger',
      action: () => {
        void runUninstall();
      },
    });
  }
  return { title: '更多操作', actions };
});

const load = async () => {
  if (!props.name) return;
  await refreshInstalledPlugins();
  index.value = await fetchRaycastStoreIndex();
  ext.value = findRaycastExtensionByName(index.value.extensions, props.name);
};

onPageEnter(load);
onMounted(load);
</script>

<style lang="scss" scoped>
.detail-content {
  padding: 24px 24px 16px;
  overflow: auto;
  height: 100%;
  box-sizing: border-box;
}

.detail-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.detail-icon {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: var(--ui-bg-muted);
  object-fit: contain;
}
.detail-icon-placeholder {
  display: block;
}
.detail-title {
  margin: 12px 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary-color);
}
.detail-meta {
  font-size: 13px;
  color: var(--text-secondary-color);
  .meta-sep {
    margin: 0 6px;
  }
  .meta-version {
    opacity: 0.6;
  }
}

.detail-divider {
  height: 1px;
  background: var(--divider-color);
  margin: 16px 0;
}

.detail-description {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary-color);
  opacity: 0.85;
}

.commands-section {
  margin-top: 16px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary-color);
  margin: 0 0 8px;
}
.commands-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.command-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  &:not(:last-child) {
    border-bottom: 1px solid var(--divider-color);
  }
  .command-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    flex-shrink: 0;
    background: var(--ui-bg-muted);
    object-fit: contain;
  }
  .command-icon-ph {
    display: block;
  }
  .command-info {
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .command-title-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }
  .command-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary-color);
  }
  .command-mode-badge {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.2;
    padding: 2px 8px;
    border-radius: 6px;
    background: var(--ui-bg-muted);
    color: var(--text-secondary-color);
  }
  .command-subtitle {
    font-size: 12px;
    color: var(--text-secondary-color);
    margin-top: 1px;
  }
}

.detail-footer-info {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary-color);
  .footer-link {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--ui-primary);
    text-decoration: none;
    cursor: pointer;
  }
  .stat-icon {
    font-size: 16px;
  }
}
</style>
