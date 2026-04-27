import searchAppList from './lib/loadApplications';
import { exec } from 'child_process';
import { channel } from '@public-tauri/api/node';

searchAppList().then((apps) => {
  channel.emit('apps', apps);
});

channel.handle('searchAppList', searchAppList);

channel.handle('openApp', (appPath: string) => {
  exec(`open -a "${appPath}"`);
});
