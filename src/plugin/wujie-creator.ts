/**
 * Wujie 子应用创建器
 *
 * 统一管理 Wujie 子应用的创建，自动注册到池中并处理 LRU 驱逐
 */

import { preloadApp, setupApp } from 'wujie';
import { resolveResource } from '@tauri-apps/api/path';
import path from 'path-browserify';
import {
  dialog,
  utils,
  clipboard,
  fetch,
  screen,
  mainWindow,
  Database,
  showSaveFilePicker,
  fs,
  resolveFileIcon,
  resolveLocalPath,
  shell,
  opener,
  WebviewWindow,
  Webview,
  NativeWindow,
  createPluginChannel,
  createPluginStorage,
} from '@public/core';
import type { IPluginLifecycle, IAction, ICommand } from '@public/schema';
import { wujiePool } from './wujie-pool';
import logger from '@/utils/logger';

// BUILTIN_PLUGINS_PATH 在 vite-env.d.ts 中声明
declare const BUILTIN_PLUGINS_PATH: string;

// 模板路径缓存
let templatePathCache: string | null = null;

/**
 * 获取模板路径
 */
export const getTemplatePath = async (): Promise<string> => {
  if (templatePathCache) {
    return templatePathCache;
  }

  if (import.meta.env.DEV) {
    // DEV: plugins 目录位于 BUILTIN_PLUGINS_PATH，template 在其父目录的 packages 子目录
    templatePathCache = path.join(BUILTIN_PLUGINS_PATH, '..', 'packages', 'template', 'dist');
  } else {
    templatePathCache = await resolveResource('../packages/template/dist');
  }

  return templatePathCache;
};

/**
 * 获取插件的入口 URL
 */
export const getEntryUrl = (name: string, pathname: string): string => {
  // 如果 name 是 @xxxx/yyy 格式，则路径是 http://yyy.xxxx.plugin.localhost
  if (/^@[^/]+\/[^/]+/.test(name)) {
    const [scope, pluginName] = name.split('/');
    return `http://${pluginName}.${scope.replace('@', '')}.plugin.localhost:2345${pathname}`;
  }
  return `http://${name}.plugin.localhost:2345${pathname}`;
};

interface CreateWujieOptions {
  /** 插件名称 */
  name: string;
  /** 入口 URL */
  entryUrl: string;
  /** 是否存在 Node server module */
  hasServerModule?: boolean;
  /** 额外注入的脚本 */
  insertScript?: { content: string; module?: boolean };
  /** 在 wujie 环境中执行的插件 main 入口 */
  mainScript?: {
    url: string;
    updateCommands: (commands: ICommand[]) => void;
    getPreferences: () => Record<string, any>;
    onPlugin: (plugin: IPluginLifecycle) => void;
  };
  /** 是否预加载（默认 true） */
  preload?: boolean;
}

const createMainLoaderScript = (name: string, url: string) => `
(async () => {
  try {
    const mod = await import(${JSON.stringify(url)});
    const createPlugin = mod.default || mod;
    if (typeof createPlugin === 'function') {
      const pluginReturn = createPlugin();
      window.$wujie.props.createMainPlugin?.(await pluginReturn);
    }
    window.$wujie.props.resolveMain?.();
  } catch (error) {
    console.error('[public-tauri] failed to load plugin main: ${name}', error);
    window.$wujie.props.rejectMain?.(error);
  }
})();
`;

/**
 * 创建 Wujie 子应用
 *
 * 该函数会自动：
 * 1. 注册到 Wujie 子应用池
 * 2. 处理 LRU 驱逐（如果超出最大数量）
 * 3. 返回生命周期和事件对象
 */
export const createWujieApp = (options: CreateWujieOptions): {
  events: EventTarget;
  mainReady: Promise<void>;
} => {
  const { name, entryUrl, hasServerModule = false, insertScript, mainScript, preload = true } = options;
  const events = new EventTarget();
  let resolveMain: () => void = () => {};
  let rejectMain: (reason?: any) => void = () => {};
  const mainReady = mainScript
    ? new Promise<void>((resolve, reject) => {
      resolveMain = resolve;
      rejectMain = reject;
    })
    : Promise.resolve();
  const jsBeforeLoaders = [
    insertScript,
    mainScript ? { content: createMainLoaderScript(name, mainScript.url), module: true } : undefined,
  ].filter(Boolean) as { content: string; module?: boolean }[];

  setupApp({
    name,
    url: entryUrl,
    exec: true,
    alive: true,
    fetch(input, init) {
      const url = input instanceof Request ? input.url : input;
      const { host } = new URL(url);
      if (host.endsWith('.localhost:2345') || host === '127.0.0.1:2345' || host === 'localhost:2345') {
        return window.fetch(input, init);
      }

      return fetch(input, init);
    },
    props: {
      dialog,
      utils,
      clipboard,
      fetch,
      screen,
      mainWindow,
      Database,
      showSaveFilePicker,
      fs,
      resolveFileIcon,
      resolveLocalPath,
      shell,
      opener,
      WebviewWindow,
      Webview,
      NativeWindow,

      storage: createPluginStorage(name),
      channel: createPluginChannel(name, { hasServerModule }),
      createMainPlugin: (opts: IPluginLifecycle) => {
        mainScript?.onPlugin(opts);
      },
      updateCommands: (commands: ICommand[]) => {
        mainScript?.updateCommands(commands);
      },
      getPreferences: () => mainScript?.getPreferences() || {},
      resolveMain,
      rejectMain,
      updateActions: (actions?: IAction[]) => {
        events.dispatchEvent(new CustomEvent('updateActions', { detail: { actions, plugin: name } }));
      },
      updateSearchBarValue: (value: string) => {
        console.log('updateSearchBarValue', value);
        events.dispatchEvent(new CustomEvent('updateSearchBarValue', { detail: { value } }));
      },
      updateSearchBarVisible: (visible: boolean) => {
        events.dispatchEvent(new CustomEvent('updateSearchBarVisible', { detail: { visible } }));
      },
      events,
    },
    plugins: jsBeforeLoaders.length ? [
      {
        jsBeforeLoaders,
      },
    ] : [],
  });

  if (preload) {
    preloadApp({ name });
  }

  // 注册到池中
  wujiePool.set(name);

  logger.info(`[WujieCreator] Created app: ${name}, entryUrl: ${entryUrl}`);

  return {
    events,
    mainReady,
  };
};

/**
 * 销毁 Wujie 子应用
 * 会从池中移除并调用 destroyApp
 */
export const destroyWujieApp = (name: string): void => {
  wujiePool.destroy(name);
};

/**
 * 检查 Wujie 子应用是否存在
 */
export const hasWujieApp = (name: string): boolean => wujiePool.has(name);
