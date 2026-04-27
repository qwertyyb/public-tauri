import type { Worker } from 'node:worker_threads';
import type { Socket } from 'socket.io';

type PluginState = {
  staticPaths: string[] | null | undefined,
  cwd: string,

  modulePath?: string | null
  worker?: Worker

  socket?: Socket
};

export const plugins: Map<string, PluginState> = new Map();

export const setSocket = (name: string, socket: Socket | undefined) => {
  plugins.set(name, {
    ...plugins.get(name)!,
    socket,
  });
};
