import Ajv from 'ajv';
import path from 'path-browserify'
import { readTextFile } from '@tauri-apps/plugin-fs'
import schema from './plugin.schema.json'
import { formatCommand, getLocalPath, hanziToPinyin,  openCommandPreferences, openPluginPreferences, popView } from './utils';
import { getItem, setItem } from './storage';
import { builtinPluginsPath } from './const';

const ajv = new Ajv({ allowUnionTypes: true })
const validate = ajv.compile(schema)

const plugins: Map<string, IRunningPlugin> = new Map()
let pluginsSettings: IPluginsSettings = {}

const resultsMap = new WeakMap<IPluginCommand, { score: number, query: string, owner: IRunningPlugin }>()

const save = () => {
  return setItem('pluginsSettings', pluginsSettings)
}

const checkPluginsRegistered = (path: string) => {
  return Array.from(plugins.values()).some(item => item.path === path)
}

const checkManifest = (manifest: Partial<IPluginManifestConfig>) => {
  if (validate(manifest)) return;

  if (validate.errors?.length) {
    console.error(manifest, validate.errors)
    const err = new Error('校验失败')
    // @ts-ignore
    err.errors = [...validate.errors]
    throw err
  }
}

export const registerPlugin = async (pluginPath: string) => {
  console.log('addPlugin', pluginPath)
  if (checkPluginsRegistered(pluginPath)) {
    console.warn('插件已注册,请勿重复注册: ' + pluginPath)
    return
  }
  try {
    console.log('pkgPath', getLocalPath('./package.json', pluginPath)!)
    const pkg = JSON.parse(await readTextFile(getLocalPath('./package.json', pluginPath)!))
    const publicPlugin = pkg.publicPlugin
    const { commands: _, icon, ...rest } = publicPlugin;
    const main = rest.main || pkg.main
    const name = rest.name || pkg.name
    const manifest: IPluginManifest = { name, ...rest, main, icon: icon ? getLocalPath(icon, pluginPath) : icon }
    checkManifest({ ...manifest, commands: _ })
    const commands: IPluginCommand[] = (publicPlugin.commands || []).map((item: any) => formatCommand(item, manifest, pluginPath))
    if (!pluginsSettings[name]) {
      pluginsSettings[name] = { disabled: false, commands: {}, preferences: {} }
    }
    const pluginInstance: IRunningPlugin = {
      manifest,
      path: pluginPath,
      commands,
      settings: pluginsSettings[name]
    }
    if (main && !pluginsSettings?.[name]?.disabled) {
      const entryPath = getLocalPath(main, pluginPath)!
      console.log('plugin', name)
      const mod = await import(entryPath)
      const createPlugin = mod.default || mod as IPluginCreator
      if (typeof createPlugin === 'function') {
        const pluginReturn = createPlugin({
          updateCommands: (commands: IPluginCommandConfig[]) => {
            pluginInstance.commands = commands.map(item => formatCommand(item, manifest, pluginPath))
          },
          showCommands: (commands: IPluginCommandConfig[]) => {
            commands.forEach(command => resultsMap.set(formatCommand(command, manifest, pluginPath), { score: 1, query: '', owner: pluginInstance }))
            window.dispatchEvent(new CustomEvent('plugin:showCommands', { detail: { name: manifest.name, commands }}))
          },
          getPreferences: () => {
            return pluginsSettings[name]?.preferences || {}
          }
        }) as IPluginReturn
        pluginInstance.plugin = await pluginReturn
      }
    }
    plugins.set(pkg.name, pluginInstance)
    return pluginInstance
  } catch (err) {
    console.error(err)
    throw new Error(`引入插件 ${pluginPath} 失败: ${(err as any).message}`)
  }
}

export const unregisterPlugin = (name: string) => {
  plugins.delete(name)
}

export const getPlugins = (options?: { includeDisabledPlugins?: boolean, includeDisabledCommands?: boolean }) => {
  if (options?.includeDisabledPlugins && options?.includeDisabledCommands) {
    return plugins
  }
  return [...plugins].reduce<Map<string, IRunningPlugin>>((acc, [name, plugin]) => {
    const need = options?.includeDisabledPlugins || !options?.includeDisabledPlugins && !plugin.settings?.disabled
    if (!need) return acc
    const commands = plugin.commands.filter(command => {
      if (options?.includeDisabledCommands) return true
      const settings = pluginsSettings[name]?.commands?.[command.name]
      return !settings?.disabled
    })
    acc.set(name, {
      ...plugin,
      commands
    })
    return acc
  }, new Map())
}

export const disablePlugin = (name: string, disabled: boolean) => {
  const plugin = plugins.get(name)
  if (!plugin) {
    console.warn('插件不存在: ' + name)
    return
  }
  const settings = pluginsSettings[name]
  if (!settings) {
    pluginsSettings[name] = {
      disabled,
      commands: {}
    }
    save()
    return
  }
  pluginsSettings[name]!.disabled = disabled
  save()
}

export const disablePluginCommand = (name: string, commandName: string, disabled: boolean) => {
  const plugin = plugins.get(name)
  if (!plugin) {
    console.warn('插件不存在: ' + name)
    return
  }
  const settings = pluginsSettings[name]
  if (!settings) {
    pluginsSettings[name] = {
      disabled: false,
      commands: {
        [commandName]: {
          disabled,
          alias: '',
          shortcuts: '',
        }
      }
    }
    save()
    return
  }
  if (!settings.commands) {
    settings.commands = {
      [commandName]: {
        disabled,
        alias: '',
        shortcuts: '',
      }
    }
    save()
    return
  }
  if (!settings.commands[commandName]) {
    settings.commands[commandName] = {
      disabled,
      alias: '',
      shortcuts: '',
    }
    save()
    return
  }
  settings!.commands![commandName]!.disabled = disabled
  save()
}


export const updatePluginsSettings = (value: IPluginsSettings) => {
  // pluginsSettings = value
}

export const updatePluginSettings = (name: string, value: Partial<Omit<IPluginSettings, 'commands'>>) => {
  const plugin = plugins.get(name)
  if (!plugin) return;
  Object.entries(value).forEach(([key, val]) => {
    // @ts-ignore
    plugin.settings![key] = val
  })
}

export const updateCommandSettings = (pluginName: string, commandName: string, settings: ICommandSettings) => {
  const plugin = plugins.get(pluginName)
  if (!plugin) return;
  plugin.settings!.commands[commandName] = { ...plugin.settings?.commands[commandName], ...settings }
  save()
}

export const getPlugin = (name: string) => {
  return plugins.get(name)
}

export const launchPlugins = async () => {
  const result = await getItem<IPluginsSettings>('pluginsSettings')
  console.log('pluginsSettings', result)
  pluginsSettings = result || {}

  // const names = [
  //   'launcher', 'command', 'calculator', 'qrcode', 'links', 'translate', 'clipboard',
  //   'douban', 'magic', 'ai-chat', 'v2ex', 'terminal', 'find', 'google-chrome', 'mdn', 'shortcuts', 'transform',
  //   'settings', 'snippets'
  // ]
  const names = ['clipboard', 'translate']
  
  const pluginsPathList = names.map(name => ({ path: path.join(builtinPluginsPath, name)! }))
  pluginsPathList.forEach(({ path }) => {
    registerPlugin(path).catch(err => {
      console.error(err)
    })
  })
}

// launchPlugins()

export const getPluginPreferences = (name: string) => {
  const plugin = plugins.get(name)
  if (!plugin) return {};
  return plugin.settings?.preferences || {}
}

export const updatePluginPreferences = (name: string, prfs: Record<string, any>) => {
  const plugin = plugins.get(name)
  if (!plugin) return;
  if (plugin.settings) {
    plugin.settings.preferences = { ...plugin.settings.preferences, ...prfs }
  } else {
    plugin.settings = {
      disabled: false,
      commands: {},
      preferences: { ...prfs }
    }
  }

  save()
}

export const getCommandPreferences = (pluginName: string, commandName: string) => {
  const plugin = plugins.get(pluginName)
  if (!plugin) return {};
  const command = plugin.settings!.commands[commandName]
  if (!command) return {};
  return command.preferences || {}
}

export const updateCommandPreferences = (pluginName: string, commandName: string, prfs: Record<string, any>) => {
  updatePluginPreferences(pluginName, {})
  if (!plugins.get(pluginName)) return;
  const command = plugins.get(pluginName)!.settings!.commands[commandName]
  if (command) {
    plugins.get(pluginName)!.settings!.commands[commandName]!.preferences = { ...command.preferences, ...prfs }
  } else {
    plugins.get(pluginName)!.settings!.commands[commandName] = {
      disabled: false,
      preferences: { ...prfs }
    }
  }

  save()
}

const checkRequired = (preferences: IPreference[], values: Record<string, any>) => {
  const requiredFields = preferences.filter(i => i.required) || []
  return requiredFields.every(item => values[item.name] || values[item.name] === 0)
}

const checkPreferences = async (owner: IRunningPlugin, command: IPluginCommand) => {
  // 首先需要判断插件层级的必须首选项是否已填写，再检查 command 层级的首选项
  let count = 0
  if (!checkRequired(owner.manifest.preferences || [], owner.settings?.preferences || {})) {
    count += 1
    await openPluginPreferences(owner.manifest.name, { wait: true })
  }
  if (!checkRequired(command.preferences || [], owner.settings?.commands[command.name]?.preferences || {})) {
    count += 1
    await openCommandPreferences(owner.manifest.name, command.name, { wait: true })
  }
  return count
}

export const enterCommand = async (owner: IRunningPlugin, command: IPluginCommand, matchData: ICommandMatchData) => {
  // 判断一下组件所需的首选项是否都已填写，如果都已填写，则直接执行，否则跳转去配置
  // 首先需要判断插件层级的必须首选项是否已填写，再检查 command 层级的首选项
  const count = await checkPreferences(owner, command)
  if (count) {
    popView({ count })
  }
  if (command.mode === 'none' || !command.mode) {
    owner.plugin?.onEnter?.(command, matchData)
  } else if (command.mode === 'listView') {
    const mod = await import(command.preload!)
    // @ts-ignore
    window.publicAppCommand = mod.default || mod
    window.dispatchEvent(new CustomEvent('push-view', { detail: { path: '/plugin/list-view', params: { command, plugin: owner, match: matchData, publicCommand: mod.default || mod } } }))
  } else if (command.mode === 'view') {
    window.dispatchEvent(new CustomEvent('push-view', { detail: { path: '/plugin/view', params: { plugin: owner, command, match: matchData } } }))
  }
}

export const enterCommandByName = (pluginName: string, commandName: string, matchData: ICommandMatchData) => {
  const plugin = plugins.get(pluginName)
  if (!plugin) return;
  const command = plugin.commands.find(item => item.name === commandName)
  if (!command) return;
  return enterCommand(plugin, command, matchData)
}
