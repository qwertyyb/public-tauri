import { createPluginChannel, definePlugin } from '@public/api';

const { invoke, on } = createPluginChannel('launcher');

const launcherPlugin = definePlugin((utils) => {
  on('apps', apps => utils.updateCommands(apps));
  return ({
    onEnter(app) {
      invoke('openApp', app.path);
    },
  });
});

export default launcherPlugin;

