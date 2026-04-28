export type PluginFrontendApi = Record<string, unknown>;

const pluginFrontendApis = new Map<string, PluginFrontendApi>();

export function registerPluginFrontendApi(name: string, api: PluginFrontendApi) {
  pluginFrontendApis.set(name, api);
  return () => {
    if (pluginFrontendApis.get(name) === api) {
      pluginFrontendApis.delete(name);
    }
  };
}

export function unregisterPluginFrontendApi(name: string) {
  pluginFrontendApis.delete(name);
}

export async function invokePluginFrontendApi(pluginName: string, method: string, args: unknown[]) {
  const api = pluginFrontendApis.get(pluginName);
  if (!api) {
    throw new Error(`插件 ${pluginName} 前端 API 未就绪`);
  }
  const objectPath = method.split('.');
  let target: unknown = api;
  for (const key of objectPath.slice(0, -1)) {
    target = (target as Record<string, unknown>)[key];
    if (target === null || target === undefined) {
      throw new Error(`插件 ${pluginName} 前端 API 不存在: ${method}`);
    }
  }
  const functionName = objectPath[objectPath.length - 1];
  if (!functionName) {
    throw new Error(`插件 ${pluginName} 前端 API 无效: ${method}`);
  }
  const fn = (target as Record<string, unknown>)[functionName];
  if (typeof fn !== 'function') {
    throw new Error(`插件 ${pluginName} 前端 API 非函数: ${method}`);
  }
  return await (fn as (...a: unknown[]) => unknown)(...args);
}
