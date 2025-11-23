import module from 'module';
import { isDev } from '../utils';

const require = module.createRequire(import.meta.url);

const addonPath = isDev() ? '../../build/Release/addon.node' : '../build/Release/addon.node';

const addon = require(addonPath);

export const getFileIcon = (filePath: string, size = 32): Promise<Buffer> => addon.getIconForFile(filePath, size);

export const hanziToPinyin = (hanzi: string) => addon.hanziToPinyin(hanzi) as string;

export const getFrontmostApplication = (): { bundleIdentifier: string, name: string } => addon.getFrontmostAppInfo();
