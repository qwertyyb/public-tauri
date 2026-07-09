import { reloadPlugin } from '@/plugin/manager';
import { installDevPlugin } from '@/services/developer';

if (import.meta.env.DEV) {
  window.__PUBLIC_DEV_REGISTER_PLUGIN_PATH__ = installDevPlugin;
  window.__PUBLIC_DEV_RELOAD_PLUGIN_FROM_PATH__ = reloadPlugin;
}
