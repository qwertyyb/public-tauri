import { setupApp, preloadApp } from 'wujie'


interface IListItem extends Record<string, any> {
  title: string
  subtitle?: string
  icon?: string
}

interface IPlugin {
  name: string
  title: string
  description: string
  onQuery?: (query: string) => Promise<void | IListItem[]>,
  onSelect?: (result: IListItem) => Promise<void>,
  onEnter?: (result: IListItem) => Promise<void> | void,
}

export const loadPlugin = (entry: string): Promise<IPlugin> => {
  return new Promise((resolve, reject) => {
    setupApp({
      name: entry,
      exec: true,
      url: entry,
      loadError: (url, error) => {
        reject(error)
      },
      props: {
        register: (plugin: IPlugin) => {
          resolve(plugin)
        }
      }
    })
    preloadApp({ name: entry })
  })
}