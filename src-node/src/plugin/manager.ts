export const plugins = new Map<string, {
  modulePath: string,
  instance: any
}>()

export const registerPlugin = async (name: string, modulePath: string) => {
  plugins.set(name, {
    modulePath,
    instance: await import(modulePath).then(mod => mod.default || mod)
  })
}

export const unregisterPlugin = (name: string) => {
  plugins.delete(name)
}

export const updatePlugin = (name: string, modulePath: string) => {
  unregisterPlugin(name)
  registerPlugin(name, modulePath + '?_t=' + Math.random())
}

export const callPlugin = (name: string, methodName: string, args: any[]) => {
  const plugin = plugins.get(name)
  if (!plugin) {
    throw new Error(`插件 ${name} 不存在`)
  }
  if (plugin.instance?.[methodName] && typeof plugin.instance?.[methodName] === 'function') {
    return plugin.instance[methodName](...args)
  }
  throw new Error(`插件 ${name} 无 ${methodName} 方法`)
}