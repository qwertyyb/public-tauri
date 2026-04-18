import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { popToRoot, pushView } from '@/plugin/utils';

/**
 * 解析 `public://store/<plugin-name>`，其中 plugin-name 可为 scoped npm 包（如 `@scope/pkg`）。
 * 也接受路径百分号编码，例如 `public://store/%40scope%2Fpkg`。
 */
export function parsePublicStoreDeepLink(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'public:') return null;

  let segment = '';
  if (u.hostname === 'store') {
    segment = u.pathname.replace(/^\/+/, '');
  } else if (u.pathname.startsWith('/store/')) {
    segment = u.pathname.slice('/store/'.length);
  } else {
    return null;
  }

  if (!segment) return null;

  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

async function openStoreDetail(name: string) {
  const w = getCurrentWindow();
  await w.show();
  await w.setFocus();
  popToRoot({ clearInput: true });
  pushView({ path: '/plugin/store/detail', params: { name } });
}

async function handleDeepLinkUrls(urls: string[]) {
  for (const url of urls) {
    const name = parsePublicStoreDeepLink(url);
    if (name) {
      await openStoreDetail(name);
      return;
    }
  }
}

/** 在本地服务与插件初始化完成后再调用 */
export async function initDeepLinks() {
  if (!isTauri()) return;

  const initial = await getCurrent();
  if (initial?.length) {
    await handleDeepLinkUrls(initial);
  }

  await onOpenUrl((urls) => {
    void handleDeepLinkUrls(urls);
  });
}
