<script setup lang="ts">
import HomeView from '@/views/HomeView.vue';
import PluginPrfsView from '@/views/PluginPrfsView.vue';
import SettingsView from '@/views/SettingsView.vue';
import AboutView from '@/views/AboutView.vue';
import StoreView from '@/views/StoreView.vue';
import RaycastStoreView from '@/views/RaycastStoreView.vue';
import StoreDetailView from '@/views/StoreDetailView.vue';
import StoreRaycastDetailView from '@/views/StoreRaycastDetailView.vue';
import RoutePage from '@/components/RoutePage.vue';
import { nextTick, onBeforeUnmount, provide, shallowRef, useTemplateRef, type Component } from 'vue';
import { routerSymbol } from './router';
import { showAlert, showConfirm, showToast } from '@/utils/feedback';
import PluginWujieView from '@/views/PluginWujieView.vue';
import CreatePluginView from '@/views/CreatePluginView.vue';
import DevPluginsView from '@/views/DevPluginsView.vue';
import TransitionResidualTestView from '@/views/TransitionResidualTestView.vue';
import { isKeyPressed } from '@/utils/keyboard';

const hash = location.hash.substring(1);

const routes: Record<string, Component | undefined> = {
  '/': HomeView,
  '/plugin/prfs': PluginPrfsView,
  '/settings': SettingsView,
  '/about': AboutView,
  '/plugin/store': StoreView,
  '/plugin/store/raycast': RaycastStoreView,
  '/plugin/store/detail': StoreDetailView,
  '/plugin/store/raycast-detail': StoreRaycastDetailView,
  '/plugin/view/wujie': PluginWujieView,
  '/developer/create': CreatePluginView,
  '/developer/plugins': DevPluginsView,
  '/dev/transition-residual-test': TransitionResidualTestView,
};

const pages = useTemplateRef('page');

const history = shallowRef<{
  component: Component,
  props?: any,
}[]>([
  { component: routes[hash] || HomeView },
]);

const pushView = async (options: { path: string, params?: any }) => {
  const { path, params } = options;
  const component = routes[path];
  if (component) {
    history.value = [...history.value, { component, props: params }];
    await nextTick();
    pages.value?.[history.value.length - 2]?.dispatchLeave();
  }
};

const popView = async (options?: { count?: number }) => {
  const count = options?.count || 1;
  history.value = [...history.value.slice(0, Math.max(1, history.value.length - count))];
  await nextTick();
  pages.value?.[history.value.length - 1]?.dispatchEnter();
};


const pushViewHandler = (e: any) => pushView(e.detail);
const popViewHandler = (e: any) => popView(e.detail);
const popToRootHandler = () => {
  popView({ count: history.value.length - 1 });
};

const showAlertHandler = (event: any) => {
  const { message, title, ...options } = event.detail.options;
  return showAlert(message, title, options);
};

const showConfirmHandler = (event: any) => {
  const { message, title, ...options } = event.detail.options;
  return showConfirm(message, title, options);
};

const showToastHandler = (event: any) => {
  const { message, ...options } = event.detail.options;
  return showToast(message, options);
};

const keydownHandler = (event: KeyboardEvent) => {
  if (isKeyPressed(event, 'Escape') && history.value.length > 1) {
    popView();
  }
};

window.addEventListener('push-view', pushViewHandler);
window.addEventListener('pop-view', popViewHandler);
window.addEventListener('pop-to-root', popToRootHandler);
window.addEventListener('app:showAlert', showAlertHandler);
window.addEventListener('app:showConfirm', showConfirmHandler);
window.addEventListener('app:showToast', showToastHandler);
window.addEventListener('keydown', keydownHandler);

onBeforeUnmount(() => {
  window.removeEventListener('push-view', pushViewHandler);
  window.removeEventListener('pop-view', popViewHandler);
  window.removeEventListener('pop-to-root', popToRootHandler);
  window.removeEventListener('app:showAlert', showAlertHandler);
  window.removeEventListener('app:showConfirm', showConfirmHandler);
  window.removeEventListener('app:showToast', showToastHandler);
  window.removeEventListener('keydown', keydownHandler);
});

provide(routerSymbol, {
  pushView: (path: string, params: any) => pushView({ path, params }),
  popView: (options?: { count?: number }) => popView(options),
});

</script>

<template>
  <UApp>
    <div class="app">
      <header
        v-if="history.length > 1"
        class="app-header"
      >
        <div class="nav-back">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="popView()"
          />
        </div>
        <div class="space" />
      </header>
      <ul class="history-list">
        <route-page
          v-for="(item, index) in history"
          :key="index"
          ref="page"
          class="history-item"
        >
          <component
            :is="item.component"
            v-bind="item.props"
          />
        </route-page>
      </ul>
    </div>
  </UApp>
</template>

<style lang="scss" scoped>
.app-header {
  height: var(--nav-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  width: 100%;
  pointer-events: none;
  .nav-back {
    pointer-events: auto;
  }
}
.history-list {
  .history-item:not(:last-child) {
    display: none;
  }
}
</style>

<style>
.text-single-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
