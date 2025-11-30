import { mainWindow, definePlugin } from '@public/api';

const createPlugin = definePlugin(() =>  ({
  onEnter(_command, query) {
    mainWindow.pushView({ path: '/ai/chat', params: { query } });
  },
}));

export default createPlugin;
