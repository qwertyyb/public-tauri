import { createPluginChannel } from '@public/api/core';

const { invoke, on } = createPluginChannel('launcher');

const launcherPlugin = (utils) => {
  on('apps', apps => utils.updateCommands(apps));
  return ({
    onEnter(app) {
      invoke('openApp', app.path);
    },
  });
};

export default launcherPlugin;

