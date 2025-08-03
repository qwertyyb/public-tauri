import { getItem, setItem } from "./storage"

export const plugins: Map<string, IRunningPlugin> = new Map()
let pluginsSettings: IPluginsSettings = {}

const resultsMap = new WeakMap<IPluginCommand, { score: number, query: string, owner: IRunningPlugin }>()

const save = () => {
  return setItem('pluginsSettings', pluginsSettings)
}

const init = async () => {
  const result = await getItem<IPluginsSettings>('pluginsSettings')
  console.log('pluginsSettings', result)
  pluginsSettings = result || {}
}