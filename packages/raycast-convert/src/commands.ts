import path from 'node:path';
import { exists } from './files';
import type { ConvertedCommand, RaycastCommand } from './types';

const findCommandEntry = async (inputDir: string, command: RaycastCommand) => {
  const candidates = [
    path.join(inputDir, 'src', `${command.name}.tsx`),
    path.join(inputDir, 'src', `${command.name}.ts`),
    path.join(inputDir, 'src', `${command.name}.jsx`),
    path.join(inputDir, 'src', `${command.name}.js`),
    path.join(inputDir, 'src', command.name, 'index.tsx'),
    path.join(inputDir, 'src', command.name, 'index.ts'),
    path.join(inputDir, 'src', command.name, 'index.jsx'),
    path.join(inputDir, 'src', command.name, 'index.js'),
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
};

const SUPPORTED_COMMAND_MODES = new Set(['no-view', 'view']);

export const resolveSupportedCommands = async (inputDir: string, sourceCommands: RaycastCommand[]) => {
  const convertedCommands: ConvertedCommand[] = [];
  const skippedCommands: { name: string, reason: string }[] = [];

  for (const command of sourceCommands) {
    const mode = command.mode || 'view';
    if (!SUPPORTED_COMMAND_MODES.has(mode)) {
      skippedCommands.push({ name: command.name, reason: `Unsupported mode: ${command.mode || '<empty>'}` });
      continue;
    }
    const entry = await findCommandEntry(inputDir, command);
    if (!entry) {
      skippedCommands.push({ name: command.name, reason: 'Command entry not found under src/' });
      continue;
    }
    convertedCommands.push({ ...command, mode: mode as ConvertedCommand['mode'], entry });
  }

  if (!convertedCommands.length) {
    throw new Error('No supported Raycast commands were converted');
  }

  return { convertedCommands, skippedCommands };
};

/** @deprecated Use {@link resolveSupportedCommands} */
export const resolveNoViewCommands = resolveSupportedCommands;
