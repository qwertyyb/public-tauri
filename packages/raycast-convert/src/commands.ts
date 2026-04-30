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

export const resolveNoViewCommands = async (inputDir: string, sourceCommands: RaycastCommand[]) => {
  const convertedCommands: ConvertedCommand[] = [];
  const skippedCommands: { name: string, reason: string }[] = [];

  for (const command of sourceCommands) {
    if (command.mode !== 'no-view') {
      skippedCommands.push({ name: command.name, reason: `Unsupported mode: ${command.mode || '<empty>'}` });
      continue;
    }
    const entry = await findCommandEntry(inputDir, command);
    if (!entry) {
      skippedCommands.push({ name: command.name, reason: 'Command entry not found under src/' });
      continue;
    }
    convertedCommands.push({ ...command, entry });
  }

  if (!convertedCommands.length) {
    throw new Error('No Raycast no-view commands were converted');
  }

  return { convertedCommands, skippedCommands };
};
