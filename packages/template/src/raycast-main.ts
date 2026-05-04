import { createApp } from 'vue';
import RaycastDevShell from './raycast/RaycastDevShell.vue';
import RaycastPublicTauriViewApp from './raycast/RaycastPublicTauriViewApp.vue';
import { isRaycastViewStandaloneDev } from './raycast/wujie-utils';

const root = document.getElementById('raycast-app');
if (root) {
  createApp(isRaycastViewStandaloneDev() ? RaycastDevShell : RaycastPublicTauriViewApp).mount(root);
}
