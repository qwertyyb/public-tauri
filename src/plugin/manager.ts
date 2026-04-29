import path, { join } from 'path-browserify';
import { globalShortcut, mainWindow, registerServerModule, storage } from '@public/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { formatCommand, getLocalPath, openCommandPreferences, openPluginPreferences, popView, pushView, resolveIconUrl } from './utils';
import { set } from 'es-toolkit/compat';
import { resolveResource } from '@tauri-apps/api/path';
import { startApp } from 'wujie';
import { parsePluginConfig, type IPluginManifest, type ICommand as IPluginCommand, type IPluginLifecycle, type IPreference, type ICommandActionOptions, type IAction } from '@public/schema';
import logger from '@/utils/logger';
import type { IRunningPlugin, IPluginsSettings, IPluginSettings, ICommandSettings } from '@/types/plugin';
import { BUILTIN_PLUGINS } from './builtin';
import { DEV_PLUGIN_PATH_LIST_KEY, migratePluginPathListsFromLegacy, STORE_PLUGIN_PATH_LIST_KEY } from '@/services/store';
import { wujiePool } from './wujie-pool';
import { createWujieApp, destroyWujieApp, getEntryUrl, getTemplatePath } from './wujie-creator';
import { INNER_PLUGIN_NAMES } from './constants';

const plugins: Map<string, IRunningPlugin> = new Map(BUILTIN_PLUGINS);
let pluginsSettings: IPluginsSettings = {};

let resolvePluginsReady: (() => void) | undefined;
/** 全部内置 / 开发 / 用户自定义插件注册流程结束后 resolve（无论单个插件是否报错） */
export const whenPluginsReady = new Promise<void>((resolve) => {
  resolvePluginsReady = resolve;
});

const save = () => storage.setItem('pluginsSettings', pluginsSettings);

const checkPluginsRegistered = (path: string) => Array.from(plugins.values()).some(item => item.path === path);

/** 是否已有插件实例使用该磁盘路径（用于避免重复加载） */
export const isPluginPathRegistered = (pluginPath: string) => checkPluginsRegistered(pluginPath);

export const registerPlugin = async (pluginPath: string) => {
  if (checkPluginsRegistered(pluginPath)) {
    console.warn(`插件已注册,请勿重复注册: ${pluginPath}`);
    return;
  }
  try {
    console.log('pkgPath', getLocalPath('./package.json', pluginPath)!);
    const pkg = JSON.parse(await readTextFile(getLocalPath('./package.json', pluginPath)!));
    const { publicPlugin } = pkg;
    const manifest: IPluginManifest = parsePluginConfig({ ...publicPlugin, name: pkg.name });
    manifest.icon = resolveIconUrl(manifest.icon, pluginPath);
    const { name, template, html } = manifest;
    const isDisabled = Boolean(pluginsSettings?.[name]?.disabled);
    const commands: IPluginCommand[] = (publicPlugin.commands || []).map((item: any) => formatCommand(item, manifest, pluginPath));
    if (!pluginsSettings[name]) {
      pluginsSettings[name] = { disabled: false, commands: {}, preferences: {} };
    }
    const pluginInstance: IRunningPlugin = {
      manifest,
      path: pluginPath,
      commands,
      settings: pluginsSettings[name],
    };
    if (!isDisabled) {
      const serverModulePath = manifest.server ? join(pluginPath, manifest.server) : '';
      const staticPaths: string[] = [];
      if (template === 'listView' || (manifest.main && !html)) {
        staticPaths.push(await getTemplatePath(), pluginPath);
      } else {
        staticPaths.push(pluginPath);
      }
      // 纯前端 main（无 server、无 wujie html、非 listView）不依赖 Node 侧 register；避免 WKWebView 对 localhost:2345 的 fetch 在部分环境下失败导致整插件加载中断
      // const needsNodeSidecar = Boolean(serverModulePath) || template === 'listView' || Boolean(html);
      await registerServerModule(name, {
        modulePath: serverModulePath,
        staticPaths,
      });
    }
    if (!isDisabled && (html || template === 'listView' || manifest.main)) {
      let entryUrl = getEntryUrl(name, '/index.html');
      if (html) {
        entryUrl = /^https?:\/\//.test(html) ? html : getEntryUrl(name, path.join('/', html));
      }
      const listViewScript = template === 'listView'
        ? {
          content: `window.$commands = ${JSON.stringify((publicPlugin.commands || []).map((item: any) => {
            if (!item.preload) return null;
            const url = getEntryUrl(name, path.join('/', item.preload));
            return {
              url,
              name: item.name,
            };
          }).filter(Boolean))}`,
          module: true,
        }
        : undefined;
      const mainPlugin: IPluginLifecycle = {};
      if (manifest.main) {
        pluginInstance.plugin = mainPlugin;
      }
      const { events, mainReady } = createWujieApp({
        name,
        entryUrl,
        hasServerModule: Boolean(manifest.server),
        insertScript: listViewScript,
        mainScript: manifest.main ? {
          url: getEntryUrl(name, path.join('/', manifest.main)),
          updateCommands: (commands: IPluginCommand[]) => {
            pluginInstance.commands = commands.map(item => formatCommand(item, manifest, pluginPath));
          },
          getPreferences: () => pluginsSettings[name]?.preferences || {},
          onPlugin: (plugin) => {
            const lifecycleKeys: (keyof IPluginLifecycle)[] = ['onInput', 'onSelect', 'onExit', 'onAction'];
            lifecycleKeys.forEach((key) => {
              try {
                const handler = plugin?.[key];
                if (typeof handler === 'function') {
                  mainPlugin[key] = handler as any;
                }
              } catch (err) {
                console.warn(`[plugin-manager] failed to read lifecycle ${String(key)} for ${name}`, err);
              }
            });
          },
        } : undefined,
      });
      pluginInstance.entryUrl = entryUrl;
      pluginInstance.events = events;
      if (manifest.main) {
        await mainReady.catch((error) => {
          console.warn(`[plugin-manager] plugin main ready warning: ${name}`, error);
        });
      }
    }
    plugins.set(pkg.name, pluginInstance);
    return pluginInstance;
  } catch (err) {
    console.error(err);
    throw new Error(`引入插件 ${pluginPath} 失败: ${(err as any).message}`);
  }
};

export const unregisterPlugin = (name: string) => {
  plugins.delete(name);
  destroyWujieApp(name);
};

/**
 * DEV/WebDriver：先卸载再重新 registerPlugin。
 * 注意：部分环境下动态 import 会缓存同一 URL 的模块，若热重载后仍跑旧插件代码，请重启 `pnpm tauri:dev`。
 */
export const reloadPluginFromLocalPath = async (pluginPath: string): Promise<void> => {
  const pkg = JSON.parse(await readTextFile(getLocalPath('./package.json', pluginPath)!));
  unregisterPlugin(pkg.name);
  await registerPlugin(pluginPath);
  const { refreshInstalledPlugins } = await import('@/services/store');
  await refreshInstalledPlugins();
};

export const getPlugins = (options?: { includeDisabledPlugins?: boolean, includeDisabledCommands?: boolean }) => {
  if (options?.includeDisabledPlugins && options?.includeDisabledCommands) {
    return plugins;
  }
  return [...plugins].reduce<Map<string, IRunningPlugin>>((acc, [name, plugin]) => {
    const need = options?.includeDisabledPlugins || (!options?.includeDisabledPlugins && !plugin.settings?.disabled);
    if (!need) return acc;
    const commands = plugin.commands.filter((command) => {
      if (options?.includeDisabledCommands) return true;
      const settings = pluginsSettings[name]?.commands?.[command.name];
      return !settings?.disabled;
    });
    acc.set(name, {
      ...plugin,
      commands,
    });
    return acc;
  }, new Map());
};

export const disablePlugin = (name: string, disabled: boolean) => {
  const plugin = plugins.get(name);
  if (!plugin) {
    console.warn(`插件不存在: ${name}`);
    return;
  }
  const settings = pluginsSettings[name];
  if (!settings) {
    pluginsSettings[name] = {
      disabled,
      commands: {},
    };
    save();
    return;
  }
  pluginsSettings[name]!.disabled = disabled;
  save();
  destroyWujieApp(name);
};

export const disablePluginCommand = (name: string, commandName: string, disabled: boolean) => {
  const plugin = plugins.get(name);
  if (!plugin) {
    console.warn(`插件不存在: ${name}`);
    return;
  }
  const settings = pluginsSettings[name];
  if (!settings) {
    pluginsSettings[name] = {
      disabled: false,
      commands: {
        [commandName]: {
          disabled,
          alias: '',
          shortcut: '',
        },
      },
    };
    save();
    return;
  }
  if (!settings.commands) {
    settings.commands = {
      [commandName]: {
        disabled,
        alias: '',
        shortcut: '',
      },
    };
    save();
    return;
  }
  if (!settings.commands[commandName]) {
    settings.commands[commandName] = {
      disabled,
      alias: '',
      shortcut: '',
    };
    save();
    return;
  }
  settings!.commands![commandName]!.disabled = disabled;
  save();
};


export const updatePluginsSettings = (value: IPluginsSettings) => {
  pluginsSettings = value;
};

export const updatePluginSettings = (name: string, value: Partial<Omit<IPluginSettings, 'commands'>>) => {
  const plugin = plugins.get(name);
  if (!plugin) return;
  Object.entries(value).forEach(([key, val]) => {
    // @ts-ignore
    plugin.settings![key] = val;
  });
};

export const updateCommandSettings = (pluginName: string, commandName: string, settings: Partial<ICommandSettings>) => {
  const plugin = plugins.get(pluginName);
  if (!plugin) return;
  plugin.settings!.commands[commandName] = { ...plugin.settings?.commands[commandName], ...settings };
  save();
};

export const getPlugin = (name: string) => plugins.get(name);

export const getPluginPreferences = (name: string) => {
  const plugin = plugins.get(name);
  if (!plugin) return {};
  return plugin.settings?.preferences || {};
};

export const updatePluginPreferences = (name: string, prfs: Record<string, any>) => {
  const plugin = plugins.get(name);
  if (!plugin) return;
  if (plugin.settings) {
    plugin.settings.preferences = { ...plugin.settings.preferences, ...prfs };
  } else {
    plugin.settings = {
      disabled: false,
      commands: {},
      preferences: { ...prfs },
    };
  }

  save();
};

export const getCommandPreferences = (pluginName: string, commandName: string) => {
  const plugin = plugins.get(pluginName);
  if (!plugin) return {};
  const command = plugin.settings!.commands[commandName];
  if (!command) return {};
  return command.preferences || {};
};

export const updateCommandPreferences = (pluginName: string, commandName: string, prfs: Record<string, any>) => {
  updatePluginPreferences(pluginName, {});
  if (!plugins.get(pluginName)) return;
  const command = plugins.get(pluginName)!.settings!.commands[commandName];
  if (command) {
    plugins.get(pluginName)!.settings!.commands[commandName]!.preferences = { ...command.preferences, ...prfs };
  } else {
    plugins.get(pluginName)!.settings!.commands[commandName] = {
      disabled: false,
      preferences: { ...prfs },
    };
  }

  save();
};

const checkRequired = (preferences: IPreference[], values: Record<string, any>) => {
  const requiredFields = preferences.filter(i => i.required) || [];
  return requiredFields.every(item => values[item.name] || values[item.name] === 0);
};

/** manifest 未声明 action 时，用命令自身作为默认主操作 */
export function getPrimaryAction(command: IPluginCommand): IAction {
  if (command.action) return command.action;
  return { name: command.name, title: command.title, icon: command.icon };
}

export const dispatchPluginAction = async (
  owner: IRunningPlugin,
  command: IPluginCommand,
  action: IAction,
  query: string,
  options: ICommandActionOptions,
): Promise<void> => {
  const count = await checkPreferences(owner, command);
  if (count) {
    popView({ count });
  }
  await Promise.resolve(owner.plugin?.onAction?.(command, action, query, options));
};

const checkPreferences = async (owner: IRunningPlugin, command: IPluginCommand) => {
  // 首先需要判断插件层级的必须首选项是否已填写，再检查 command 层级的首选项
  let count = 0;
  if (!checkRequired(owner.manifest.preferences || [], owner.settings?.preferences || {})) {
    count += 1;
    await openPluginPreferences(owner.manifest.name, { wait: true });
  }
  if (!checkRequired(command.preferences || [], owner.settings?.commands[command.name]?.preferences || {})) {
    count += 1;
    await openCommandPreferences(owner.manifest.name, command.name, { wait: true });
  }
  return count;
};

export const enterCommand = async (owner: IRunningPlugin, command: IPluginCommand, query = '', options: ICommandActionOptions) => {
  // 判断一下组件所需的首选项是否都已填写，如果都已填写，则直接执行，否则跳转去配置
  // 首先需要判断插件层级的必须首选项是否已填写，再检查 command 层级的首选项
  const count = await checkPreferences(owner, command);
  if (count) {
    popView({ count });
  }
  const primary = getPrimaryAction(command);
  if (command.mode === 'none' || !command.mode) {
    await Promise.resolve(owner.plugin?.onAction?.(command, primary, query, options));
  } else if (command.mode === 'listView' || command.mode === 'view') {
    const wujie = {
      async mount(el: HTMLElement) {
        await startApp({ name: owner.manifest.name, el, url: owner.entryUrl! });
        owner.events?.dispatchEvent(new CustomEvent('plugin:action', {
          detail: { command, action: primary, query, options },
        }));
      },
      unmount() {
        owner.events?.dispatchEvent(new CustomEvent('plugin:exit', {
          detail: { command },
        }));
      },
    };
    pushView({ path: '/plugin/view/wujie', params: { wujie, plugin: owner, command, events: owner.events } });
  }
};

export const enterCommandByName = (pluginName: string, commandName: string, query = '', options: ICommandActionOptions) => {
  const plugin = plugins.get(pluginName);
  if (!plugin) return;
  const command = plugin.commands.find(item => item.name === commandName);
  if (!command) return;
  return enterCommand(plugin, command, query, options);
};

export const getPreferenceValues = (pluginName: string) => pluginsSettings[pluginName]?.preferences || {};

// shortcut
export const updateCommandShortcut = async (pluginName: string, commandName: string, shortcut?: string) => {
  // eslint-disable-next-line no-param-reassign
  shortcut = shortcut?.split('+').map((key) => {
    if (key === 'Meta') return 'Command';
    return key;
  })
    .join('+');
  const old = pluginsSettings?.[pluginName]?.commands[commandName]?.shortcut;
  if (old && old !== shortcut) {
    globalShortcut.unregister(old);
  }
  set(pluginsSettings, [pluginName, 'commands', commandName, 'shortcut'].join('.'), shortcut);
  save();
  if (!shortcut) return;
  if (await globalShortcut.isRegistered(shortcut)) {
    throw new Error(`shortcut ${shortcut} already registered`);
  }
  await globalShortcut.register(shortcut, (event) => {
    if (event.state === 'Pressed') {
      enterCommandByName(pluginName, commandName, '', { from: 'hotkey' });
      mainWindow.show();
    }
  });
  save();
};

const getBuiltinPluginsBasePath = async () => {
  if (import.meta.env.DEV) {
    return BUILTIN_PLUGINS_PATH;
  }
  return resolveResource('../plugins');
};

const initInnerPlugins = async () => {
  const basePath = await getBuiltinPluginsBasePath();
  logger.info('initInnerPlugins', basePath);
  return Promise.all(INNER_PLUGIN_NAMES.map(name => registerPlugin(path.join(basePath, name)).catch((err) => {
    console.error(err);
  })));
};

const initCustomPlugins = async () => {
  await migratePluginPathListsFromLegacy();
  const storePaths: string[] = (await storage.getItem(STORE_PLUGIN_PATH_LIST_KEY)) || [];
  const devPaths: string[] = (await storage.getItem(DEV_PLUGIN_PATH_LIST_KEY)) || [];
  const pluginPathList = [...storePaths, ...devPaths];
  if (!pluginPathList.length) return;
  console.warn('initCustomPlugins pluginPathList', pluginPathList);
  return Promise.all(pluginPathList.map(pluginPath => registerPlugin(pluginPath)
    .then(() => {
      console.warn('register plugin success: ', pluginPath);
    })
    .catch((err) => {
      console.error('register plugin error: ', pluginPath, err);
    })));
};

const initCommandsShortcut = () => {
  [...plugins.entries()].forEach(([pluginName, plugin]) => {
    if (plugin.settings?.disabled) return;
    plugin?.commands.forEach((command) => {
      const commandSettings = plugin.settings?.commands?.[command.name];
      if (commandSettings?.disabled) return;
      const shortcut = commandSettings?.shortcut;
      if (!shortcut) return;
      globalShortcut.register(shortcut, (event) => {
        if (event.state === 'Pressed') {
          enterCommandByName(pluginName, command.name, '', { from: 'hotkey' });
          mainWindow.show();
        }
      });
    });
  });
};

export const init = async () => {
  try {
    const result: IPluginsSettings = await storage.getItem('pluginsSettings');
    console.warn('pluginsSettings', result);
    pluginsSettings = result || {};

    // 1. 先初始化内置插件（plugins/ 目录）
    await initInnerPlugins();
    console.warn('initInnerPlugins done');

    // 2. 标记内置插件为受保护，不会被 LRU 驱逐
    for (const name of INNER_PLUGIN_NAMES) {
      wujiePool.protect(name);
    }

    // 3. 再初始化其他插件（store + dev）
    console.warn('initCustomPlugins start');
    await initCustomPlugins();
    console.warn('initCustomPlugins done');

    initCommandsShortcut();
  } finally {
    // 用 !PROD：个别环境（如自动化 WebView）下 import.meta.env.DEV 可能为 false，仍需要 E2E 钩子
    console.warn('import.meta.env.PROD', import.meta.env.PROD, typeof window !== 'undefined');
    if (!import.meta.env.PROD && typeof window !== 'undefined') {
      const { registerPluginFromLocalPath } = await import('@/services/store');
      (window as Window & { __PUBLIC_DEV_REGISTER_PLUGIN_PATH__?: (pluginPath: string) => Promise<void> }).__PUBLIC_DEV_REGISTER_PLUGIN_PATH__ = registerPluginFromLocalPath;
      (window as Window & { __PUBLIC_DEV_RELOAD_PLUGIN_FROM_PATH__?: (pluginPath: string) => Promise<void> }).__PUBLIC_DEV_RELOAD_PLUGIN_FROM_PATH__ = reloadPluginFromLocalPath;
    }
    if (typeof window !== 'undefined') {
      const { syncDevPluginFileWatchers } = await import('./devPluginHotReload');
      void syncDevPluginFileWatchers();
    }
    resolvePluginsReady?.();
    if (typeof window !== 'undefined') {
      (window as Window & { __PUBLIC_APP_PLUGINS_READY__?: boolean }).__PUBLIC_APP_PLUGINS_READY__ = true;
      window.dispatchEvent(new CustomEvent('public-app:plugins-ready', { bubbles: true }));
    }
  }
};

