<template>
  <PublicLayout :main-action="mainAction">
    <div class="detail-content">
      <div class="detail-header">
        <img
          :src="plugin?.icon"
          :alt="plugin?.manifest.title"
          class="detail-icon"
        >
        <h2 class="detail-title">
          {{ plugin?.manifest.title }}
        </h2>
        <p class="detail-meta">
          <span class="meta-version">v{{ plugin?.version }}</span>
          <span class="meta-sep">·</span>
          <span class="meta-author">{{ plugin?.author }}</span>
        </p>
      </div>

      <div class="detail-divider" />

      <p class="detail-description">
        {{ plugin?.manifest.description }}
      </p>

      <div
        v-if="plugin?.manifest.commands?.length"
        class="commands-section"
      >
        <h4 class="section-title">
          命令列表
        </h4>
        <ul class="commands-list">
          <li
            v-for="cmd in plugin.manifest.commands"
            :key="cmd.name"
            class="command-item"
          >
            <img
              :src="cmd.icon || plugin?.icon"
              :alt="cmd.title"
              class="command-icon"
            >
            <div class="command-info">
              <span class="command-title">{{ cmd.title }}</span>
              <span
                v-if="cmd.subtitle"
                class="command-subtitle"
              >{{ cmd.subtitle }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div class="detail-footer-info">
        <span class="footer-stat">
          <span class="material-symbols-outlined stat-icon">download</span>
          {{ plugin?.downloadCount }} 次下载
        </span>
        <a
          v-if="plugin?.homepage"
          :href="plugin.homepage"
          target="_blank"
          rel="noopener"
          class="footer-link"
        >
          <span class="material-symbols-outlined stat-icon">open_in_new</span>
          主页
        </a>
      </div>
    </div>
  </PublicLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PublicLayout from '@/components/PublicLayout.vue';
import { useRouter, onPageEnter } from '@/router';
import { fetchStorePlugins, isPluginInstalled, refreshInstalledPlugins } from '@/services/store';
import type { IStorePlugin } from '@/types/store';
import type { ActionPanelAction } from '@/types/plugin';

const props = defineProps<{
  name?: string;
}>();

const router = useRouter();
const plugin = ref<IStorePlugin | undefined>();
const installed = ref(false);

const mainAction = computed<ActionPanelAction | undefined>(() => {
  if (!plugin.value) return undefined;
  if (installed.value) {
    return {
      name: 'uninstall',
      title: '已安装',
      icon: 'check_circle',
      action: () => {
        router?.popView();
      },
    };
  }
  return {
    name: 'install',
    title: '安装',
    icon: 'download',
    action: () => {
      installed.value = true;
    },
  };
});

const loadPlugin = async () => {
  if (!props.name) return;
  await refreshInstalledPlugins();
  const plugins = await fetchStorePlugins();
  plugin.value = plugins.find(p => p.name === props.name);
  installed.value = plugin.value ? isPluginInstalled(plugin.value.name) : false;
};

onPageEnter(loadPlugin);
onMounted(loadPlugin);
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
  background: light-dark(#f0f0f0, #2a2a2a);
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
    background: light-dark(#f0f0f0, #2a2a2a);
  }
  .command-info {
    margin-left: 10px;
    display: flex;
    flex-direction: column;
  }
  .command-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary-color);
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
  .footer-stat, .footer-link {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .stat-icon {
    font-size: 16px;
  }
  .footer-link {
    color: light-dark(#007AFF, #0a84ff);
    text-decoration: none;
    cursor: pointer;
  }
}
</style>
