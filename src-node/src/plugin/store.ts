import type { Worker } from 'node:worker_threads';
import type { Socket } from 'socket.io';

export type PluginState = {
  staticPaths: string[] | null | undefined,
  cwd?: string,

  modulePath?: string | null
  worker?: Worker
  /** Worker 已 `BOOT_READY` 且可处理 invoke */
  serverReady?: boolean
  /** 单飞：同一插件并发 ensure 时共享 */
  workerBootPromise?: Promise<void>
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
    workerBootPromise: current?.workerBootPromise,
    serverReadyError: current?.serverReadyError,
    socket,
  });
};
