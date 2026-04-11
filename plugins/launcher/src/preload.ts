import { createPluginChannel, definePlugin, resolveFileIcon } from '@public/api';

const { invoke, on } = createPluginChannel('launcher');

const launcherPlugin = definePlugin((utils) => {
  on('apps', (apps) => {
    console.log('apps', apps);
    const commands = apps.map(app => ({
      ...app,
      icon: resolveFileIcon(app.path),
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
    onAction(command, action) {
      console.log('onAction', command, action);
      if (action.name === 'open') {
        invoke('openApp', command.path);
      }
    },
  });
});

export default launcherPlugin;

