import type { ConvertedCommand } from '../types';

const toImportName = (index: number) => `command${index}`;

export const generateServerModule = (
  commands: ConvertedCommand[],
  packageName: string,
  publicCommands: Record<string, unknown>[],
) => {
  const imports = commands.map((command, index) => `import * as ${toImportName(index)} from ${JSON.stringify(command.entry)};`).join('\n');
  const commandMapEntries = commands.map((command, index) => `  ${JSON.stringify(command.name)}: ${toImportName(index)},`).join('\n');
  const commandManifests = JSON.stringify(publicCommands, null, 2);
  return `import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { channel } from '@public-tauri/api/node';
import { __setRaycastContext } from '@public-tauri/api/raycast';

${imports}

const commandModules: Record<string, any> = {
${commandMapEntries}
};

const distDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.dirname(distDir);
const commandManifests = ${commandManifests};

channel.handle('raycast:run', async (payload = {}) => {
  const commandName = String(payload.commandName || '');
  const commandModule = commandModules[commandName];
  if (!commandModule) {
    throw new Error(\`Unknown Raycast command: \${commandName}\`);
  }
  const run = commandModule.default;
  if (typeof run !== 'function') {
    throw new Error(\`Raycast command \${commandName} has no default function export\`);
  }
  const launchPayload = payload.options?.payload || {};
  __setRaycastContext({
    pluginName: ${JSON.stringify(packageName)},
    commandName,
    commands: commandManifests,
    launchType: launchPayload.launchType,
    preferences: payload.preferences || {},
    supportPath: path.join(pluginRoot, '.raycast-compat'),
    assetsPath: path.join(pluginRoot, 'assets'),
  });
  return await run({
    arguments: launchPayload.arguments || {},
    fallbackText: launchPayload.fallbackText ?? payload.query ?? '',
    launchContext: launchPayload.context ?? payload,
    launchType: launchPayload.launchType || 'userInitiated',
  });
});
`;
};
