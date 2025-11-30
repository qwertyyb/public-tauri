import { definePlugin, mainWindow } from '@public/api';

const createSettingsPlugin = definePlugin(() => ({
  onEnter: async (_item, query) => {
    mainWindow.pushView({
      path: '/settings',
      params: { query },
    });
  },
}));


export default createSettingsPlugin;
