import searchAppList from "./lib/loadApplications"
import { exec } from 'child_process'

const createPlugin = (context) => {
  searchAppList().then((apps) => {
    context.emit('apps', apps)
  })
  return {
    searchAppList,
    openApp(appPath: string) {
      exec(`open -a "${appPath}"`)
    }
  }
}

export default createPlugin
