import { Socket } from 'socket.io';

const sockets = new Map<string, Socket>();

const waitPromises = new Map<string, { promise: Promise<void>, resolve: () => void }>();

export const getSocket = (name: string): Socket | undefined => sockets.get(name);

export const addSocket = (name: string, socket: Socket) => {
  sockets.set(name, socket);
  waitPromises.get(name)?.resolve();
};

export const removeSocket = (name: string) => {
  sockets.delete(name);
  waitPromises.delete(name);
};

export const emitEvent = async (name: string, event: string, ...args: any[]) => {
  if (sockets.has(name)) {
    return sockets.get(name)!.emit(event, ...args);
  }
  // 客户端尚未连接，需要等待连接后再执行
  if (!waitPromises.has(name)) {
    // @ts-ignore
    const { promise, resolve } = Promise.withResolvers<void>();
    waitPromises.set(name, { promise, resolve });
  }
  // wait Ready
  await waitPromises.get(name)!.promise;
  emitEvent(name, event, ...args);
};
