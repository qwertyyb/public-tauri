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
  const nvLoaders = commands.noView.map(command => `  ${JSON.stringify(command.name)}: () => import(${JSON.stringify(commandEntryImportSpecifier(layout.inputDir, layout.outputDir, layout.buildDir, command.entry))}),`).join('\n');
  const vvLoaders = commands.view.map(command => `  ${JSON.stringify(command.name)}: () => import(${JSON.stringify(commandEntryImportSpecifier(layout.inputDir, layout.outputDir, layout.buildDir, command.entry))}),`).join('\n');

  const commandManifests = JSON.stringify(publicCommands, null, 2);

  const viewRuntimeImport = commands.view.length
    ? 'import { createRaycastViewSession, __setRaycastViewContext } from \'./raycast-worker-runtime\';'
    : '';

  const raycastRunHandler = commands.noView.length
    ? `channel.handle('raycast:run', async (payload = {}) => {
  const commandName = String(payload.commandName || '');
  const loadCommandModule = commandModuleLoaders[commandName];
  if (!loadCommandModule) {
    throw new Error(\`Unknown Raycast command: \${commandName}\`);
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
  const commandModule = await loadCommandModule();
  const run = commandModule.default;
  if (typeof run !== 'function') {
    throw new Error(\`Raycast command \${commandName} has no default function export\`);
  }
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
  const loadViewCommandModule = viewCommandModuleLoaders[commandName];
  if (!loadViewCommandModule) {
    throw new Error(\`Unknown Raycast view command: \${commandName}\`);
  }
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
  const commandModule = await loadViewCommandModule();
  const Command = commandModule.default;
  if (typeof Command !== 'function') {
    throw new Error(\`Raycast view command \${commandName} has no default function export\`);
  }

  const session = createRaycastViewSession({
    emitSnapshot: (snapshot) => channel.emit('raycast:view:snapshot', snapshot),
    emitPatch: (patches) => channel.emit('raycast:view:patch', patches),
  });
  viewSessions.set(commandName, session);
  await session.mount(Command);
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
  // 无活跃 view 会话时退出 Worker，配合宿主按需加载下次再拉起线程
  if (viewSessions.size === 0) {
    queueMicrotask(() => process.exit(0));
  }
  return true;
});
`
    : '';

  const nvMapBlock = commands.noView.length
    ? `const commandModuleLoaders: Record<string, () => Promise<any>> = {
${nvLoaders}
};
`
    : 'const commandModuleLoaders: Record<string, () => Promise<any>> = {};';

  const vvMapBlock = commands.view.length
    ? `const viewCommandModuleLoaders: Record<string, () => Promise<any>> = {
${vvLoaders}
};
`
    : 'const viewCommandModuleLoaders: Record<string, () => Promise<any>> = {};';

  return `import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { channel } from '@public-tauri/api/node';
import { __setRaycastContext } from '@public-tauri/api/raycast';
${viewRuntimeImport}

${nvMapBlock}
${vvMapBlock}

const distDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.dirname(distDir);
const commandManifests = ${commandManifests};

${raycastRunHandler}
${viewHandlers}
`;
};
