import { type IPlugin, mainWindow, utils } from '@public/api';

const createAppleScriptPlugin: IPlugin = (app) => {

  app.updateCommands([
    {
      name: 'topit',
      title: '置顶窗口',
      icon: './assets/topit.png'
    }
  ])

  return {
    async onEnter(command) {
      if (command.name === 'topit') {
        await mainWindow.hide()
        setTimeout(() => {
          utils.runAppleScript(`tell application "Topit" to toggle under mouse 1`)
        }, 1500)
      }
    }
  }
}

export default createAppleScriptPlugin
