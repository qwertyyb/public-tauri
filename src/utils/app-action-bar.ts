import { type ActionPanel } from '@/components/ActionBar.vue';
import { pushView } from '@/plugin/utils';
import { showConfirm } from '@/utils/feedback';
import { exit } from '@tauri-apps/plugin-process';

const quitApp = async () => {
  try {
    await showConfirm('Are you sure you want to quit Public?', 'Quit', { type: 'warning', confirmText: 'Quit', cancelText: 'Cancel' });
    await exit(0);
  } catch {
    // user cancelled
  }
};

export const leftActionPanel: ActionPanel = {
  title: 'Public V1.0.0',
  actions: [
    { name: 'store', icon: 'storefront', title: '插件商店', action: () => pushView({ path: '/plugin/store' }) },
    { name: 'settings', icon: 'settings', title: 'Settings', action: () => pushView({ path: '/settings' }) },
    { name: 'about', icon: 'info', title: 'About Public', action: () => pushView({ path: '/about' }) },
    { name: 'exit', icon: 'exit_to_app', title: 'Quit Public', styleType: 'danger', action: quitApp },
  ],
};
