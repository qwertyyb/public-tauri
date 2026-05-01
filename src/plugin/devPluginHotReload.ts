import { isTauri } from '@tauri-apps/api/core';
import { watch, type UnwatchFn } from '@tauri-apps/plugin-fs';
import { getDevPluginPathList } from '@/services/store';
import { dialog } from '@public-tauri/core';
import { reloadPluginFromLocalPath } from './manager';
import logger from '@/utils/logger';

const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');

const unwatchByNormKey = new Map<string, UnwatchFn>();
const reloadLock = new Set<string>();

const shouldIgnoreChangedPath = (p: string) => {
  const n = norm(p);
  if (!n) return true;
  if (n.includes('/node_modules/')) return true;
  if (n.includes('/.git/')) return true;
  if (n.includes('/.pnpm/')) return true;
  if (n.endsWith('/.DS_Store')) return true;
  if (n.endsWith('/Thumbs.db')) return true;
  return false;
};

const devToast = (msg: string) => {
  if (import.meta.env.DEV) {
    void dialog.showToast(msg);
  }
};

/**
 * 为 devPluginPathList 中每个目录建立递归监听；目录变更时防抖后调用 `reloadPluginFromLocalPath`。
 * 在应用启动、注册/注销开发插件后应调用以同步监听器数量。
 */
export const syncDevPluginFileWatchers = async (): Promise<void> => {
  if (!isTauri()) return;

  let pathList: string[] = [];
  try {
    pathList = await getDevPluginPathList();
  } catch (e) {
    logger.error('devPluginHotReload: getDevPluginPathList', e);
    return;
  }

  const wantNorm = new Set(pathList.map(norm));

  for (const [key, un] of [...unwatchByNormKey]) {
    if (wantNorm.has(key)) continue;
    try {
      un();
    } catch (e) {
      logger.warn('devPluginHotReload: unwatch', key, e);
    }
    unwatchByNormKey.delete(key);
  }

  for (const pluginPath of pathList) {
    const key = norm(pluginPath);
    if (unwatchByNormKey.has(key)) continue;
    let un: UnwatchFn;
    try {
      un = await watch(
        pluginPath,
        (event) => {
          if (event.paths.length && event.paths.every(shouldIgnoreChangedPath)) return;
          if (reloadLock.has(key)) return;
          reloadLock.add(key);
          void doReload(key, pluginPath);
        },
        { recursive: true, delayMs: 600 },
      );
    } catch (e) {
      logger.error('devPluginHotReload: watch', pluginPath, e);
      devToast(`无法监听开发插件目录: ${pluginPath}`);
      continue;
    }
    unwatchByNormKey.set(key, un);
  }
};

async function doReload(key: string, pluginPath: string) {
  try {
    await reloadPluginFromLocalPath(pluginPath);
    logger.info('devPluginHotReload: reloaded', pluginPath);
    const segs = key.split('/').filter(Boolean);
    const shortName = segs.slice(-2)
      .join('/');
    devToast(`开发插件已热重载: ${shortName || key}`);
    try {
      const ev = new CustomEvent('public-app:dev-plugin-hot-reloaded', { detail: { path: pluginPath }, bubbles: true });
      window.dispatchEvent(ev);
    } catch {
      /* 非 window 环境可忽略 */
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('devPluginHotReload: reload', pluginPath, e);
    devToast(`热重载失败: ${msg}`);
  } finally {
    reloadLock.delete(key);
  }
}
