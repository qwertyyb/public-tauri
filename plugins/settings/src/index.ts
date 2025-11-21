import { mainWindow, type IPlugin } from '@public/api';

const createSettingsPlugin: IPlugin = () => ({
  onEnter: async (_item, query) => {
    mainWindow.pushView({
      path: '/settings',
      params: { query },
    });
  },
});


export default createSettingsPlugin;
