import path from 'node:path';
import type { ConvertedCommand } from '../types';

const commandEntryImportSpecifier = (
  inputDir: string,
  outputDir: string,
  buildDir: string,
  entry: string,
) => {
  const outputEntry = path.join(outputDir, path.relative(path.resolve(inputDir), path.resolve(entry)));
  let rel = path.relative(path.resolve(buildDir), outputEntry);
  rel = rel.split(path.sep).join('/');
  if (rel && !rel.startsWith('.') && !rel.startsWith('/')) {
    return `./${rel}`;
  }
  return rel;
};

export const generateServerModule = (
  commands: { noView: ConvertedCommand[]; view: ConvertedCommand[] },
  packageName: string,
  publicCommands: Record<string, unknown>[],
  layout: { inputDir: string, outputDir: string, buildDir: string },
) => {
  const nvImports = commands.noView.map((command, index) => `import * as nv${index} from ${JSON.stringify(commandEntryImportSpecifier(layout.inputDir, layout.outputDir, layout.buildDir, command.entry))};`).join('\n');
  const vvImports = commands.view.map((command, index) => `import * as vv${index} from ${JSON.stringify(commandEntryImportSpecifier(layout.inputDir, layout.outputDir, layout.buildDir, command.entry))};`).join('\n');

  const nvMap = commands.noView.map((command, index) => `  ${JSON.stringify(command.name)}: nv${index},`).join('\n');
  const vvMap = commands.view.map((command, index) => `  ${JSON.stringify(command.name)}: vv${index},`).join('\n');

  const commandManifests = JSON.stringify(publicCommands, null, 2);

  const viewRuntimeImport = commands.view.length
    ? `import { createRaycastViewSession, __setRaycastViewContext } from './raycast-worker-runtime';`
    : '';

  const raycastRunHandler = commands.noView.length
    ? `channel.handle('raycast:run', async (payload = {}) => {
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
    commandMode: 'no-view',
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
`
    : '';

  const viewHandlers = commands.view.length
    ? `const viewSessions = new Map();

channel.handle('raycast:view:mount', async (payload = {}) => {
  const commandName = String(payload.commandName || '');
  const existingSession = viewSessions.get(commandName);
  if (existingSession) {
    existingSession.unmount();
    viewSessions.delete(commandName);
  }
  const commandModule = viewCommandModules[commandName];
  if (!commandModule) {
    throw new Error(\`Unknown Raycast view command: \${commandName}\`);
  }
  const Command = commandModule.default;
  if (typeof Command !== 'function') {
    throw new Error(\`Raycast view command \${commandName} has no default function export\`);
  }

  const session = createRaycastViewSession({
    emitSnapshot: (snapshot) => channel.emit('raycast:view:snapshot', snapshot),
  });
  viewSessions.set(commandName, session);
  __setRaycastViewContext({
    pluginName: ${JSON.stringify(packageName)},
    commandName,
    preferences: payload.preferences || {},
    supportPath: path.join(pluginRoot, '.raycast-compat'),
    assetsPath: path.join(pluginRoot, 'assets'),
    launchProps: {
      arguments: payload.options?.payload?.arguments || {},
      fallbackText: payload.options?.payload?.fallbackText ?? payload.query ?? '',
      launchContext: payload.options?.payload?.context ?? payload,
      launchType: payload.options?.payload?.launchType || 'userInitiated',
    },
  });
  await session.mount(Command);
  return true;
});

channel.handle('raycast:view:select', async (payload = {}) => {
  const session = viewSessions.get(String(payload.commandName || ''));
  if (!session) return false;
  session.selectItem(String(payload.itemId || ''));
  return true;
});

channel.handle('raycast:view:run-action', async (payload = {}) => {
  const session = viewSessions.get(String(payload.commandName || ''));
  if (!session) throw new Error(\`No Raycast view session for \${String(payload.commandName || '')}\`);
  const rawArgs = payload.args;
  const args = Array.isArray(rawArgs) ? rawArgs : [];
  await session.dispatchHostEvent(String(payload.hostId || ''), String(payload.event || 'onAction'), args);
  return true;
});

channel.handle('raycast:view:unmount', async (payload = {}) => {
  const commandName = String(payload.commandName || '');
  const session = viewSessions.get(commandName);
  if (session) {
    session.unmount();
    viewSessions.delete(commandName);
  }
  return true;
});
`
    : '';

  const nvMapBlock = commands.noView.length
    ? `const commandModules: Record<string, any> = {
${nvMap}
};
`
    : 'const commandModules: Record<string, any> = {};';

  const vvMapBlock = commands.view.length
    ? `const viewCommandModules: Record<string, any> = {
${vvMap}
};
`
    : 'const viewCommandModules: Record<string, any> = {};';

  return `import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { channel } from '@public-tauri/api/node';
import { __setRaycastContext } from '@public-tauri/api/raycast';
${viewRuntimeImport}

${nvImports}
${vvImports}

${nvMapBlock}
${vvMapBlock}

const distDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.dirname(distDir);
const commandManifests = ${commandManifests};

${raycastRunHandler}
${viewHandlers}
`;
};
