import { type IRunningPlugin } from '@/types/plugin';
import { type ICommand, type ICommandMatchPair } from '@public/schema';

export const plugins: Map<string, IRunningPlugin> = new Map();

export const resultsMap = new WeakMap<ICommand, { owner: IRunningPlugin, query?: string } & Partial<ICommandMatchPair>>();

