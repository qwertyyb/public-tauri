import type { Worker } from 'node:worker_threads';
import type { Socket } from 'socket.io';

type PluginState = {
  staticPaths: string[] | null | undefined,
  cwd?: string,

  modulePath?: string | null
  worker?: Worker
  serverReady?: boolean
  serverReadyPromise?: Promise<void>
  serverReadyReject?: (e: Error) => void
  serverReadyError?: string

  socket?: Socket
};

export const plugins: Map<string, PluginState> = new Map();

export const setSocket = (name: string, socket: Socket | undefined) => {
  const current = plugins.get(name);
  if (!current && !socket) {
    return;
  }
  plugins.set(name, {
    staticPaths: current?.staticPaths,
    cwd: current?.cwd,
    modulePath: current?.modulePath,
    worker: current?.worker,
    serverReady: current?.serverReady,
    serverReadyPromise: current?.serverReadyPromise,
    serverReadyReject: current?.serverReadyReject,
    serverReadyError: current?.serverReadyError,
    socket,
  });
};
