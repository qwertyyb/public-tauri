import { mainWindow } from '@public/api';

const createSettingsPlugin: IPlugin = utils =>

// window.requestIdleCallback(() => {
//   initSettings()
// })

  ({
    onEnter: async (item, matchData) => {
      mainWindow.pushView({
        path: '/settings',
        params: { query: matchData.query },
      });
    },
  });


export default createSettingsPlugin;
