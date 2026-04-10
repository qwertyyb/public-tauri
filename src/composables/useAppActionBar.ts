import { type ActionPanel } from '@/components/ActionBar.vue';
import { useRouter } from '@/router';
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

export const useAppActionBar = () => {
  const router = useRouter();

  const leftActionPanel: ActionPanel = {
    title: 'Public V1.0.0',
    actions: [
      { icon: 'settings', label: 'Settings', action: () => router?.pushView('/settings') },
      { icon: 'info', label: 'About Public', action: () => router?.pushView('/about') },
      { icon: 'exit_to_app', label: 'Quit Public', styleType: 'danger', action: quitApp },
    ],
  };

  return {
    leftActionPanel,
  };
};
