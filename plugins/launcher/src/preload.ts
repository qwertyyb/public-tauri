import { createPluginChannel, definePlugin, resolveFileIcon, updateCommands } from '@public-tauri/api';

const { invoke, on } = createPluginChannel('launcher');

const launcherPlugin = definePlugin(() => {
  on('apps', (apps) => {
    console.log('apps', apps);
    const commands = apps.map(app => ({
      ...app,
      icon: resolveFileIcon(app.path),
      action: { name: 'open', icon: 'open_in_new', title: '启动应用' },
    }));
    updateCommands(commands);
  });
  return ({
    onAction(command, action) {
      console.log('onAction', command, action);
      if (action.name === 'open') {
        invoke('openApp', command.path);
      }
    },
  });
});

export default launcherPlugin;

