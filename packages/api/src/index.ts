import { io } from 'socket.io-client'

const socket = io('http://127.0.0.1:2345', {
  path: 'ws'
})

const invokeServer = async (name: string, method: string, args: any[]) => {
  const r = await fetch('http://127.0.0.1:2345/api/manager/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, method, args})
  })
  const { data } = await r.json()
  return data
}

const createPluginAPI = (name: string) => {
  return {
    invoke: async (method: string, ...args: any[]) => {
      return invokeServer(name, method, args)
    },
    on: (event: string, callback: (data: any) => void) => {
      socket.on(event, callback)
    }
  }
}

const api = createPluginAPI((process.env as any).PUBLIC_PLUGIN_NAME)

export default api