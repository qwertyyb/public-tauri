import { showHUD } from '@raycast/api';

export default async function command() {
  await showHUD('Raycast HUD smoke passed', { clearRootSearch: true });
}
