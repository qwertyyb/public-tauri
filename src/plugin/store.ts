import { getItem, setItem } from './storage';

export const plugins: Map<string, IRunningPlugin> = new Map();
let pluginsSettings: IPluginsSettings = {};

export const resultsMap = new WeakMap<IPluginCommand, { owner: IRunningPlugin, query?: string }>();

const save = () => setItem('pluginsSettings', pluginsSettings);

const init = async () => {
  const result = await getItem<IPluginsSettings>('pluginsSettings');
  console.log('pluginsSettings', result);
  pluginsSettings = result || {};
};
