import path from 'node:path';
import { exists } from './files';
import type { ConvertedCommand, RaycastCommand, RaycastCommandArgument } from './types';

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
const SUPPORTED_COMMAND_ARGUMENT_TYPES = new Set(['text', 'password', 'dropdown']);

const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const validateCommandArguments = (command: RaycastCommand): string | null => {
  const args = command.arguments;
  if (!args) return null;
  if (!Array.isArray(args)) return 'arguments must be an array';
  if (args.length > 3) return 'arguments length exceeds Raycast limit (3)';

  for (const item of args) {
    const arg = item as RaycastCommandArgument;
    if (!isObject(arg)) return 'argument item must be an object';
    if (!arg.name || typeof arg.name !== 'string') return 'argument.name is required';
    if (!arg.type || typeof arg.type !== 'string' || !SUPPORTED_COMMAND_ARGUMENT_TYPES.has(arg.type)) {
      return `argument "${arg.name}" has unsupported type: ${String(arg.type)}`;
    }
    if (arg.required !== undefined && typeof arg.required !== 'boolean') {
      return `argument "${arg.name}" has invalid required field`;
    }
    if (arg.placeholder !== undefined && typeof arg.placeholder !== 'string') {
      return `argument "${arg.name}" has invalid placeholder field`;
    }
    if (arg.type === 'dropdown') {
      if (!Array.isArray(arg.data) || arg.data.length === 0) {
        return `dropdown argument "${arg.name}" requires non-empty data`;
      }
      for (const option of arg.data) {
        if (!isObject(option) || typeof option.value !== 'string') {
          return `dropdown argument "${arg.name}" has invalid option value`;
        }
      }
    }
  }
  return null;
};

export const resolveSupportedCommands = async (inputDir: string, sourceCommands: RaycastCommand[]) => {
  const convertedCommands: ConvertedCommand[] = [];
  const skippedCommands: { name: string, reason: string }[] = [];

  for (const command of sourceCommands) {
    const mode = command.mode || 'view';
    if (!SUPPORTED_COMMAND_MODES.has(mode)) {
      skippedCommands.push({ name: command.name, reason: `Unsupported mode: ${command.mode || '<empty>'}` });
      continue;
    }
    const argumentErr = validateCommandArguments(command);
    if (argumentErr) {
      skippedCommands.push({ name: command.name, reason: `Invalid arguments: ${argumentErr}` });
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
