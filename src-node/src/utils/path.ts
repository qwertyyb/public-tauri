import { homedir } from 'node:os';
import { join } from 'node:path';
import { ensureDirSync } from 'fs-extra';

const bundleIdentifier = 'com.qwertyyb.public-tauri';

export const getConfigDir = () => {
  const configDir = join(homedir(), `Library/Application Support/${bundleIdentifier}`);
  ensureDirSync(configDir);
  return configDir;
};
