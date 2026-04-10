import { createPluginChannel, definePlugin } from '@public/api';

const { invoke, on } = createPluginChannel('launcher');

const launcherPlugin = definePlugin((utils) => {
  on('apps', (apps) => {
    const commands = apps.map(app => ({
      ...app,
      actions: [
        { name: 'open', icon: 'open_in_new', title: 'Open Application' },
      ],
    }));
    utils.updateCommands(commands);
  });
  return ({
    onEnter(app) {
      invoke('openApp', app.path);
    },
  });
});

export default launcherPlugin;

