const connectServer = () => {
  
}

const createPluginAPI = (name: string) => {
  return {
    invoke: (method: string, ...args) => {

    },
    on: (event: string, callback: (data: any) => void) => {

    }
  }
}

const api = createPluginAPI((process.env as any).PUBLIC_PLUGIN_NAME)

export default api