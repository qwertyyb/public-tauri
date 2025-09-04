import { mainWindow, type IPlugin } from '@public/api';

const createSettingsPlugin: IPlugin = () => ({
  onEnter: async (_item, matchData) => {
    mainWindow.pushView({
      path: '/settings',
      params: { query: matchData.query },
    });
  },
});


export default createSettingsPlugin;
