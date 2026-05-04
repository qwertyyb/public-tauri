import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { channel } from '@public-tauri/api/node';
import { __setRaycastContext } from '@public-tauri/api/raycast';
import { createRaycastViewSession, __setRaycastViewContext } from './raycast-worker-runtime';


import * as vv0 from "../src/search.tsx";

const commandModules: Record<string, any> = {};
const viewCommandModules: Record<string, any> = {
  "search": vv0,
};


const distDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.dirname(distDir);
const commandManifests = [
  {
    "name": "search",
    "title": "Raycast View Search",
    "subtitle": "Validate Worker-rendered List, Detail, and ActionPanel",
    "description": "Shows a Raycast List rendered from the Node Worker.",
    "icon": "extension",
    "mode": "view",
    "matches": [
      {
        "type": "text",
        "keywords": [
          "raycast",
          "view",
          "worker",
          "search"
        ]
      }
    ]
  }
];


const viewSessions = new Map();

channel.handle('raycast:view:mount', async (payload = {}) => {
  const commandName = String(payload.commandName || '');
  const existingSession = viewSessions.get(commandName);
  if (existingSession) {
    existingSession.unmount();
    viewSessions.delete(commandName);
  }
  const commandModule = viewCommandModules[commandName];
  if (!commandModule) {
    throw new Error(`Unknown Raycast view command: ${commandName}`);
  }
  const Command = commandModule.default;
  if (typeof Command !== 'function') {
    throw new Error(`Raycast view command ${commandName} has no default function export`);
  }

  const session = createRaycastViewSession({
    emitSnapshot: (snapshot) => channel.emit('raycast:view:snapshot', snapshot),
  });
  viewSessions.set(commandName, session);
  __setRaycastViewContext({
    pluginName: "@public-tauri-raycast/raycast-view-basic",
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
  if (!session) throw new Error(`No Raycast view session for ${String(payload.commandName || '')}`);
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

