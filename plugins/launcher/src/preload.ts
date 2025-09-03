import { invoke, on } from '@public/api';

const launcherPlugin = (utils) => {
  on('apps', apps => utils.updateCommands(apps));
  return ({
    onEnter(app) {
      invoke('openApp', app.path);
    },
  });
};

export default launcherPlugin;

