import { Socket } from 'socket.io';
import { plugins, setSocket } from './store';

const CHANNEL_EVENT = '__public_tauri_channel_event__';

const waitPromises = new Map<string, { promise: Promise<void>, resolve: () => void }>();
let channelEventHandler: ((name: string, event: string, args: any[]) => void) | null = null;

export const getSocket = (name: string): Socket | undefined => plugins.get(name)?.socket;

export const addSocket = (name: string, socket: Socket) => {
  setSocket(name, socket);
  socket.on(CHANNEL_EVENT, (payload: { event?: string, args?: any[] }) => {
    if (!payload?.event) {
      return;
    }
    channelEventHandler?.(name, payload.event, payload.args || []);
  });
  waitPromises.get(name)?.resolve();
};

export const removeSocket = (name: string) => {
  setSocket(name, undefined);
  waitPromises.delete(name);
};

export const emitEvent = async (name: string, event: string, ...args: any[]): Promise<boolean> => {
  const socket = getSocket(name);
  if (socket) {
    return socket.emit(event, ...args);
  }
  // 客户端尚未连接，需要等待连接后再执行
  if (!waitPromises.has(name)) {
    // @ts-ignore
    const { promise, resolve } = Promise.withResolvers<void>();
    waitPromises.set(name, { promise, resolve });
  }
  // wait Ready
  await waitPromises.get(name)!.promise;
  return emitEvent(name, event, ...args);
};

export const setChannelEventHandler = (handler: (name: string, event: string, args: any[]) => void) => {
  channelEventHandler = handler;
};
