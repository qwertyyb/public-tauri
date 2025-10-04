import { emitEvent } from './sockets';

export const plugins = new Map<string, {
  modulePath?: string | null,
  instance?: any,
  staticPaths?: string[] | null,
}>();

const createContext = (name: string) => ({
  emit: (event: string, ...args: any[]) => {
    emitEvent(name, event, ...args);
  },
});

export const registerPlugin = async (name: string, options: { staticPaths?: string[], modulePath?: string }) => {
  let mod: Function | null = null;
  if (options.modulePath) {
    mod = await import(options.modulePath).then(mod => mod.default || mod);
  }
  plugins.set(name, {
    ...options,
    instance: mod?.(createContext(name)),
  });
};

export const unregisterPlugin = (name: string) => {
  plugins.delete(name);
};

export const updatePlugin = (name: string, options: { staticPaths?: string[], modulePath?: string }) => {
  unregisterPlugin(name);
  registerPlugin(name, {
    staticPaths: options.staticPaths,
    modulePath: options.modulePath ? `${options.modulePath}?_t=${Math.random()}` : undefined,
  });
};

export const callPlugin = (name: string, methodName: string, args: any[]) => {
  const plugin = plugins.get(name);
  if (!plugin) {
    throw new Error(`插件 ${name} 不存在`);
  }
  if (plugin.instance?.[methodName] && typeof plugin.instance?.[methodName] === 'function') {
    return plugin.instance[methodName](...args);
  }
  throw new Error(`插件 ${name} 无 ${methodName} 方法`);
};
