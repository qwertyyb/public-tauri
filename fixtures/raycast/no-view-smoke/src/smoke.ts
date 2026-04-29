import fs from 'node:fs/promises';
import path from 'node:path';
import { Clipboard, getPreferenceValues, open, showToast, Toast } from '@raycast/api';

type Preferences = {
  message?: string;
  targetUrl?: string;
};

export default async function command() {
  const preferences = getPreferenceValues<Preferences>();
  const currentDir = await fs.readdir(process.cwd());
  const marker = path.join('raycast', 'phase1', String(currentDir.length));
  const message = preferences.message || marker;

  await Clipboard.copy(message);
  await showToast({
    style: Toast.Style.Success,
    title: 'Raycast smoke passed',
    message,
  });

  if (preferences.targetUrl) {
    await open(preferences.targetUrl);
  }
}
