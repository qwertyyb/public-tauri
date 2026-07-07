import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { popToRoot, pushView } from '@/plugin/utils';
import { installDevPlugin } from '@/services/store';
import { showToast } from './feedback';

type RouteHandler = (url: string, params?: Record<string, string | undefined>) => void;

if (!globalThis.URLPattern) {
  await import('urlpattern-polyfill');
}

const SCHEMA_ORIGIN = 'public://public.qwertyyb.com';

const openStoreDetail: RouteHandler = async (_, params) => {
  if (!params?.name) return;
  const w = getCurrentWindow();
  await w.show();
  await w.setFocus();
  popToRoot({ clearInput: true });
  let { name } = params;
  try {
    name = decodeURIComponent(params.name);
  } catch {}
  pushView({ path: '/plugin/store/detail', params: { name } });
};

const importPlugin: RouteHandler = async (url: string) => {
  const path = new URL(url).searchParams.get('path');
  if (!path) return;
  try {
    const plugin = await installDevPlugin(path);
    if (!plugin) return;
    const w = getCurrentWindow();
    await w.show();
    await w.setFocus();
    showToast(`导入开发中插件成功: ${plugin.manifest.title}`);
  } catch (err) {
    showToast(`导入开发中插件失败: ${err instanceof Error ? err.message : String(err)}`);
  }
};


const handlers: { pattern: string; handler: RouteHandler }[] = [
  {
    pattern: '/store/:name',
    handler: openStoreDetail,
  },
  {
    pattern: '/developer/import',
    handler: importPlugin,
  },
];

const handleDeepLinkUrl = async (url: string) => {
  if (!url.startsWith(SCHEMA_ORIGIN)) return;
  for (const handler of handlers) {
    const match = new URLPattern(handler.pattern, SCHEMA_ORIGIN).exec(url);
    if (match) {
      await handler.handler(url, match.pathname.groups);
    }
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

if (import.meta.env.DEV) {
  window.__DEEP_LINK_HANDLER = handleDeepLinkUrl;
}
