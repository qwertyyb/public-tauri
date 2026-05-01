<template>
  <PublicLayout :main-action="mainAction">
    <template #top>
      <div class="store-top">
        <InputBar
          v-model="input"
          class="input-bar"
          placeholder="搜索 Raycast 扩展..."
          style="--nav-width: 36px;"
          @escape="escapeHandler"
        />
      </div>
    </template>
    <ResultView
      :results="results"
      class="result-view"
      @select="onResultSelect"
      @enter="onResultEnter"
    />
  </PublicLayout>
</template>

<script setup lang="ts">
import InputBar from '@/components/InputBar.vue';
import ResultView from '@/components/ResultView.vue';
import PublicLayout from '@/components/PublicLayout.vue';
import { computed, ref, watch, onMounted } from 'vue';
import type { IResultItem } from '@public-tauri/schema';
import type { ActionPanelAction } from '@/types/plugin';
import { useRouter } from '@/router';
import { refreshInstalledPlugins, isPluginInstalled } from '@/services/store';
import {
  fetchRaycastStoreIndex,
  searchRaycastExtensions,
  raycastExtensionIconUrl,
  publicPluginNpmNameForRaycastExtension,
} from '@/services/raycast-store';
import type { RaycastStoreExtension, RaycastStoreIndex } from '@/types/raycast-store';
import { popView } from '@/plugin/utils';
import { showToast } from '@/utils/feedback';

const router = useRouter();

const selectedListItem = ref<IResultItem | null>(null);

const results = ref<IResultItem[]>([]);
const input = ref<{ keyword: string, files: File[] }>({ keyword: '', files: [] });

let allRaycast: RaycastStoreExtension[] = [];
let raycastIndex: RaycastStoreIndex | null = null;

const toRaycastResult = (ext: RaycastStoreExtension): IResultItem => ({
  icon: raycastExtensionIconUrl(ext, raycastIndex!) || undefined,
  title: ext.title,
  subtitle: isPluginInstalled(publicPluginNpmNameForRaycastExtension(ext))
    ? '已安装'
    : (ext.author || ext.description?.slice(0, 48) || ''),
  name: ext.name,
});

const updateResults = (keyword: string) => {
  if (!allRaycast.length || !raycastIndex) return;
  results.value = (keyword ? searchRaycastExtensions(allRaycast, keyword) : allRaycast).map(toRaycastResult);
};

watch(input, () => {
  if (allRaycast.length) {
    updateResults(input.value?.keyword || '');
  }
});

onMounted(async () => {
  try {
    raycastIndex = await fetchRaycastStoreIndex();
    allRaycast = raycastIndex.extensions;
    await refreshInstalledPlugins();
    updateResults(input.value.keyword);
  } catch {
    showToast('获取 Raycast 商店索引失败');
  }
});

const openRaycastDetail = (item: IResultItem | null) => {
  if (!item?.name) return;
  router?.pushView('/plugin/store/raycast-detail', { name: item.name });
};

const onResultSelect = (item: IResultItem | null, _index: number) => {
  selectedListItem.value = item;
};

const onResultEnter = (item: IResultItem | null) => {
  openRaycastDetail(item);
};

const mainAction = computed<ActionPanelAction | undefined>(() => {
  if (!selectedListItem.value?.name) return undefined;
  return {
    name: 'raycast-store-open-detail',
    title: '查看详情',
    icon: 'chevron_right',
    action: () => openRaycastDetail(selectedListItem.value),
  };
});

const escapeHandler = () => {
  popView();
};

</script>

<style lang="scss" scoped>
.store-top {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
</style>
