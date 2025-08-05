import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";

const socket = io('http://localhost:2345', {
  path: '/socket.io',
  query: {
    name: 'launcher'
  }
})

const launcherPlugin = (utils) => {
  socket.on('apps', apps => utils.updateCommands(apps))
  return ({
    onEnter (app) {
      const { exec } = require('child_process')
      exec(`open -a "${app.path}"`)
    }
  })
}

export default launcherPlugin

