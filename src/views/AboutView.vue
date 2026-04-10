<template>
  <PublicLayout :left-action-panel="leftActionPanel">
    <div class="about-content">
      <img
        :src="logoUrl"
        alt=""
        class="app-icon"
      >
      <h1 class="app-name">
        {{ name }}
      </h1>
      <p class="app-version">
        Version {{ version }}
      </p>
      <p class="framework-version">
        Built with Tauri {{ tauriVersion }}
      </p>
      <a
        class="repo-link"
        @click.prevent="openRepo"
      >
        View on GitHub
      </a>
    </div>
  </PublicLayout>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { getName, getVersion, getTauriVersion } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-shell';
import logoUrl from '@/assets/logo.png';
import PublicLayout from '@/components/PublicLayout.vue';
import { useAppActionBar } from '@/composables/useAppActionBar';

const repoUrl = 'https://github.com/qwertyyb/public-tauri';

const openRepo = async () => {
  await open(repoUrl);
};

const name = ref('');
const version = ref('');
const tauriVersion = ref('');

const { leftActionPanel } = useAppActionBar();

onMounted(async () => {
  const [appName, appVersion, frameworkVersion] = await Promise.all([
    getName(),
    getVersion(),
    getTauriVersion(),
  ]);

  name.value = appName;
  version.value = appVersion;
  tauriVersion.value = frameworkVersion;
});
</script>

<style lang="scss" scoped>
.about-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
}

.app-icon {
  width: 80px;
  height: 80px;
  border-radius: 18px;
  margin-bottom: 20px;
}

.app-name {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.3px;
  margin: 0 0 4px;
}

.app-version {
  font-size: 14px;
  opacity: 0.6;
  margin: 0 0 2px;
}

.framework-version {
  font-size: 13px;
  opacity: 0.35;
  margin: 0 0 24px;
}

.repo-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  opacity: 0.55;
  cursor: pointer;
  transition: opacity 0.15s;

  &::before {
    content: '';
    display: inline-block;
    width: 16px;
    height: 16px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.57 7.57 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z' fill='currentColor'/%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
  }

  &:hover {
    opacity: 0.85;
  }
}
</style>
