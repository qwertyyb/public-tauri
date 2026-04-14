<template>
  <PublicLayout :left-action-panel="leftActionPanel">
    <template #top>
      <InputBar
        v-model="input"
        class="input-bar"
        placeholder="搜索插件..."
        style="--nav-width: 36px;"
        @escape="escapeHandler"
      />
    </template>
    <ResultView
      :results="results"
      class="result-view"
      @enter="onResultEnter"
    />
  </PublicLayout>
</template>

<script setup lang="ts">
import InputBar from '@/components/InputBar.vue';
import ResultView from '@/components/ResultView.vue';
import PublicLayout from '@/components/PublicLayout.vue';
import { ref, watch, onMounted } from 'vue';
import type { IResultItem } from '@public/schema';
import { useAppActionBar } from '@/composables/useAppActionBar';
import { useRouter } from '@/router';
import { fetchStorePlugins, searchPlugins, isPluginInstalled, refreshInstalledPlugins } from '@/services/store';
import type { IStorePlugin } from '@/types/store';
import { popView } from '@/plugin/utils';
import { showToast } from '@/utils/feedback';

const { leftActionPanel } = useAppActionBar();
const router = useRouter();

const results = ref<IResultItem[]>([]);
const input = ref<{ keyword: string, files: File[] }>({ keyword: '', files: [] });

let allPlugins: IStorePlugin[] = [];

const toResult = (plugin: IStorePlugin): IResultItem => ({
  icon: plugin.icon,
  title: plugin.manifest.title,
  subtitle: plugin.manifest.subtitle && isPluginInstalled(plugin.manifest.subtitle) ? '已安装' : plugin.manifest.subtitle || '',
  name: plugin.name,
});

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

onMounted(async () => {
  allPlugins = await fetchStorePlugins()
    .catch((err) => {
      showToast('获取插件 Store 失败');
      throw err;
    });
  await refreshInstalledPlugins();
  updateResults(input.value.keyword);
});

const onResultEnter = (item: IResultItem | null) => {
  if (!item) return;
  router?.pushView('/plugin/store/detail', { name: item.name });
};

const escapeHandler = () => {
  popView();
};

</script>
