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
import type { ICommand } from '@public/schema';
import { useAppActionBar } from '@/composables/useAppActionBar';
import { useRouter } from '@/router';
import { fetchStorePlugins, searchPlugins, isPluginInstalled, refreshInstalledPlugins } from '@/services/store';
import type { IStorePlugin } from '@/types/store';
import { popView } from '@/plugin/utils';

const { leftActionPanel } = useAppActionBar();
const router = useRouter();

const results = ref<ICommand[]>([]);
const input = ref<{ keyword: string, files: File[] }>({ keyword: '', files: [] });

let allPlugins: IStorePlugin[] = [];

const toResult = (plugin: IStorePlugin): ICommand => ({
  icon: plugin.icon,
  title: plugin.title,
  subtitle: isPluginInstalled(plugin.name) ? '已安装' : plugin.subtitle || '',
  name: plugin.id,
  mode: 'none',
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
  allPlugins = await fetchStorePlugins();
  await refreshInstalledPlugins();
  updateResults(input.value.keyword);
});

const onResultEnter = (item: ICommand | null) => {
  if (!item) return;
  router?.pushView('/plugin/store/detail', { pluginId: item.name });
};

const escapeHandler = () => {
  popView();
};

</script>
