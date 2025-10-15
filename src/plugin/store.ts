export const plugins: Map<string, IRunningPlugin> = new Map();

export const resultsMap = new WeakMap<IPluginCommand, { owner: IRunningPlugin, query?: string }>();

