import searchAppList from "./lib/loadApplications"

const createPlugin = (context) => {
  searchAppList().then((apps) => {
    context.emit('apps', apps)
  })
  return {
    searchAppList
  }
}

export default createPlugin
