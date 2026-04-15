import path, { join } from 'path-browserify';
import { resolveFileIcon, resolveLocalPath, clipboard, dialog, fetch, globalShortcut, mainWindow, utils, Database, screen, createPluginStorage, registerServerModule, invokePluginServerMethod, createPluginServerListener, storage, showSaveFilePicker, fs, shell, opener } from '@public/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { formatCommand, getLocalPath, openCommandPreferences, openPluginPreferences, popView, pushView, resolveIconUrl, withCache } from './utils';
import { set } from 'es-toolkit/compat';
import { resultsMap } from './store';
import { resolveResource } from '@tauri-apps/api/path';
import { preloadApp, setupApp, startApp } from 'wujie';
import { parsePluginConfig, type IPluginManifest, type ICommand as IPluginCommand, type IPluginLifecycle, type IPreference, type ICommandActionOptions, type IAction } from '@public/schema';
import logger from '@/utils/logger';
import type { IRunningPlugin, IPluginsSettings, IPluginSettings, ICommandSettings } from '@/types/plugin';
import { BUILTIN_PLUGINS } from './builtin';

const plugins: Map<string, IRunningPlugin> = new Map(BUILTIN_PLUGINS);
let pluginsSettings: IPluginsSettings = {};

const save = () => storage.setItem('pluginsSettings', pluginsSettings);

const checkPluginsRegistered = (path: string) => Array.from(plugins.values()).some(item => item.path === path);

export const createWujie = (name: string, entryUrl: string, options?: {
  insertScript: { content: string, module?: boolean }
}) => {
  const lifecycle: IPluginLifecycle = {};
  const events = new EventTarget();

  setupApp({
    name,
    url: entryUrl,
    exec: true,
    alive: true,
    // degrade: true,
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

      storage: createPluginStorage(name),
      invoke: (method: string, ...args: any[]) => invokePluginServerMethod(name, method, args),
      on: createPluginServerListener(name),
      createPlugin: (options: IPluginLifecycle) => {
        Object.assign(lifecycle, { ...options });
      },
      updateActions: (actions?: IAction[]) => {
        events.dispatchEvent(new CustomEvent('updateActions', { detail: { actions, plugin: name } }));
      },
      events,
    },
    plugins: options?.insertScript ? [
      {
        jsBeforeLoaders: [
          options.insertScript,
        ],
      },
    ] : [],
  });
  preloadApp({ name });
  return {
    lifecycle,
    events,
  };
};

const getEntryUrl = (name: string, pathname: string) => {
  // 如果 name 是 @xxxx/yyy 格式，则路径是 http://yyy.xxxx.plugin.localhost
  if (/^@[^/]+\/[^/]+/.test(name)) {
    const [scope, pluginName] = name.split('/');
    return `http://${pluginName}.${scope.replace('@', '')}.plugin.localhost:2345${pathname}`;
  }
  return `http://${name}.plugin.localhost:2345${pathname}`;
};

const getTemplatePath = withCache(async () => {
  const templatePath = await resolveResource('../packages/template/dist');
  return templatePath;
});

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
    if (!pluginsSettings?.[name]?.disabled) {
      const serverModulePath = manifest.server ? join(pluginPath, manifest.server) : '';
      const staticPaths: string[] = [];
      if (template === 'listView') {
        staticPaths.push(await getTemplatePath(), pluginPath);
      } else {
        staticPaths.push(pluginPath);
      }
      await registerServerModule(name, {
        modulePath: serverModulePath,
        staticPaths,
      });
    }
    if (manifest.main && !pluginsSettings?.[name]?.disabled) {
      const entryPath = getLocalPath(manifest.main, pluginPath)!;
      const mod = await import(/* @vite-ignore */entryPath);
      const createPlugin = mod.default || mod;
      if (typeof createPlugin === 'function') {
        const pluginReturn = createPlugin({
          updateCommands: (commands: IPluginCommand[]) => {
            pluginInstance.commands = commands.map(item => formatCommand(item, manifest, pluginPath));
          },
          showCommands: (commands: IPluginCommand[]) => {
            const list: IPluginCommand[] = [];
            commands.forEach((command) => {
              const item = formatCommand(command, manifest, pluginPath);
              list.push(item);
              resultsMap.set(item, { owner: pluginInstance, command: item });
            });
            window.dispatchEvent(new CustomEvent('plugin:showCommands', { detail: { name: manifest.name, commands: list } }));
          },
          getPreferences: () => pluginsSettings[name]?.preferences || {},
        }) as IPluginLifecycle;
        pluginInstance.plugin = await pluginReturn;
      }
    }
    if (html) {
      const entryUrl = /^https?:\/\//.test(html || '') ? html : getEntryUrl(name, path.join('/', html || '/index.html'));
      const { lifecycle, events } = createWujie(name, entryUrl);
      pluginInstance.lifecycle = lifecycle;
      pluginInstance.entryUrl = entryUrl;
      pluginInstance.events = events;
    } else if (template === 'listView') {
      const entryUrl = getEntryUrl(name, '/index.html');
      const commands = (publicPlugin.commands || []).map((item: any) => {
        if (!item.preload) return null;
        const url = getEntryUrl(name, path.join('/', item.preload));
        return {
          url,
          name: item.name,
        };
      }).filter(Boolean);
      const scriptContent = `window.$commands = ${JSON.stringify(commands)}`;
      const { lifecycle, events } = createWujie(name, entryUrl, {
        insertScript: { content: scriptContent, module: true },
      });
      pluginInstance.lifecycle = lifecycle;
      pluginInstance.entryUrl = entryUrl;
      pluginInstance.events = events;
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
  if (command.mode === 'none' || !command.mode) {
    owner.plugin?.onEnter?.(command, query, options);
  } else if (command.mode === 'listView' || command.mode === 'view') {
    const wujie = {
      mount(el: HTMLElement) {
        owner.lifecycle?.onEnter?.(command, query, options);
        startApp({ name: owner.manifest.name, el, url: owner.entryUrl! });
      },
      unmount() {
        owner.lifecycle?.onExit?.(command);
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
  await globalShortcut.register(shortcut, () => {
    enterCommandByName(pluginName, commandName, '', { from: 'hotkey' });
    mainWindow.show();
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
  const names = ['clipboard', 'translate', 'launcher', 'calculator', 'transform', 'snippets', 'qrcode', 'mdn', 'applescript', 'snippets', 'emoji', 'script-commands'];

  const basePath = await getBuiltinPluginsBasePath();
  logger.info('initInnerPlugins', basePath);
  return Promise.all(names.map(name => registerPlugin(path.join(basePath, name)).catch((err) => {
    console.error(err);
  })));
};

const initCustomPlugins = async () => {
  const pluginPathList: string[] | undefined = await storage.getItem('customPluginPathList');
  if (!pluginPathList) return;
  return Promise.all(pluginPathList.map(pluginPath => registerPlugin(pluginPath).catch((err) => {
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
      const handler = () => {
        enterCommandByName(pluginName, command.name, '', { from: 'hotkey' });
        mainWindow.show();
      };
      globalShortcut.register(shortcut, handler);
    });
  });
};

export const init = async () => {
  const result: IPluginsSettings = await storage.getItem('pluginsSettings');
  console.log('pluginsSettings', result);
  pluginsSettings = result || {};

  await initInnerPlugins();
  await initCustomPlugins();

  initCommandsShortcut();
};

