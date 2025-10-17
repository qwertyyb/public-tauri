import { useRouter, onPageEnter, onPageLeave } from './router';
export type { IListViewCommand, IPlugin, IPluginCommand as ICommand } from '@public/types';
export { clipboard, dialog, mainWindow, fetch, utils, screen, Database } from './core';

export const router = { useRouter, onPageEnter, onPageLeave };
