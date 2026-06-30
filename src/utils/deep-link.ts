import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { popToRoot, pushView } from '@/plugin/utils';
import { registerPluginFromLocalPath } from '@/services/store';

const SCHEMA_ORIGIN = 'public://public.qwertyyb.com';

async function openStoreDetail(url: URL) {
  const w = getCurrentWindow();
  await w.show();
  await w.setFocus();
  popToRoot({ clearInput: true });
  let name = url.pathname.match(/^\/store\/([^/]+)/)?.[1];
  if (!name) return;
  try {
    name = decodeURIComponent(name);
  } catch {}
  pushView({ path: '/plugin/store/detail', params: { name } });
}

const importPlugin = async (url: URL) => {
  const path = url.searchParams.get('path');
  if (!path) return;
  await registerPluginFromLocalPath(path);
};


const handlers = [
  {
    regexp: /^\/store\/([^/]+)/,
    handler: openStoreDetail,
  },
  {
    regexp: /^\/import/,
    handler: importPlugin,
  },
];

const handleDeepLinkUrl = async (url: string) => {
  if (!url.startsWith(SCHEMA_ORIGIN)) return;
  const handler = handlers.find(h => h.regexp.test(url));
  if (handler) {
    await handler.handler(new URL(url));
  }
};

/** 在本地服务与插件初始化完成后再调用 */
export async function initDeepLinks() {
  if (!isTauri()) return;

  const urls = await getCurrent();
  urls?.forEach(async (url) => {
    handleDeepLinkUrl(url);
  });

  onOpenUrl((urls) => {
    urls.forEach(async (url) => {
      handleDeepLinkUrl(url);
    });
  });
}
