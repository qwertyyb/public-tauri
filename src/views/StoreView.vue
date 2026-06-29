<template>
  <PublicLayout :main-action="mainAction">
    <template #top>
      <InputBar
        v-model="input"
        class="input-bar"
        placeholder="搜索插件..."
        style="--nav-width: 36px;"
        @escape="escapeHandler"
      />
    </template>
    <LoadingBar v-if="loading" />
    <ResultView
      :results="results"
      class="result-view"
      @select="onResultSelect"
      @enter="openDetail"
    />
  </PublicLayout>
</template>

<script setup lang="ts">
import InputBar from '@/components/InputBar.vue';
import ResultView from '@/components/ResultView.vue';
import PublicLayout from '@/components/PublicLayout.vue';
import { ref, watch, onMounted, computed } from 'vue';
import type { IResultItem } from '@public-tauri/schema';
import { useRouter } from '@/router';
import { fetchStorePlugins, searchPlugins, isPluginInstalled, refreshInstalledPlugins } from '@/services/store';
import type { IStorePlugin } from '@/types/store';
import { popView } from '@/plugin/utils';
import { showToast } from '@/utils/feedback';
import LoadingBar from '@/components/LoadingBar.vue';
import type { ActionPanelAction } from '@/types/plugin';

const router = useRouter();

const loading = ref(false);
const results = ref<IResultItem[]>([]);
const input = ref<{ keyword: string, files: File[] }>({ keyword: '', files: [] });

let allPlugins: IStorePlugin[] = [];
const selectedListItem = ref<IResultItem | null>(null);


const toResult = (plugin: IStorePlugin): IResultItem => ({
  icon: plugin.icon,
  title: plugin.manifest.title,
  subtitle: plugin.manifest.subtitle && isPluginInstalled(plugin.manifest.subtitle) ? '已安装' : plugin.manifest.subtitle || '',
  name: plugin.name,
});

const onResultSelect = (item: IResultItem | null, _index: number) => {
  selectedListItem.value = item;
};

const updateResults = (keyword: string) => {
  if (keyword) {
    const filtered = searchPlugins(allPlugins, keyword);
    results.value = filtered.map(toResult);
  } else {
    results.value = allPlugins.map(toResult);
  }
};

watch(input, async (value) => {
  if (allPlugins.length) {
    updateResults(value?.keyword || '');
  }
});

const mainAction = computed<ActionPanelAction | undefined>(() => {
  if (!selectedListItem.value?.name) return undefined;
  return {
    name: 'raycast-store-open-detail',
    title: '查看详情',
    icon: 'chevron_right',
    action: () => openDetail(selectedListItem.value),
  };
});

onMounted(async () => {
  loading.value = true;
  try {
    allPlugins = await fetchStorePlugins();
    await refreshInstalledPlugins();
    updateResults(input.value.keyword);
  } catch (err) {
    showToast('获取插件 Store 失败');
    throw err;
  } finally {
    loading.value = false;
  }
});

const openDetail = (item: IResultItem | null) => {
  if (!item) return;
  router?.pushView('/plugin/store/detail', { name: item.name });
};

const escapeHandler = () => {
  popView();
};

</script>
