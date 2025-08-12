import { IPlugin, mainWindow } from '@public/api'

const createPlugin: IPlugin = () =>  ({
  onEnter(command, matchData) {
    mainWindow.pushView({ path: '/ai/chat', params: { query: matchData.query } })
  },
})

export default createPlugin