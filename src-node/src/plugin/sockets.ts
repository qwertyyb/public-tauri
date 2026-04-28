import { Socket } from 'socket.io';
import { plugins, setSocket } from './store';

const CHANNEL_EVENT = '__public_tauri_channel_event__';
const CHANNEL_HANDLER_READY = '__public_tauri_channel_handler_ready__';
const CHANNEL_HANDLER_REMOVED = '__public_tauri_channel_handler_removed__';

type Deferred = { promise: Promise<void>, resolve: () => void, reject: (e: Error) => void };

const createDeferred = (): Deferred => {
  let resolve: () => void = () => {};
  let reject: (e: Error) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const socketWaiters = new Map<string, Deferred>();
const handlerWaiters = new Map<string, Deferred[]>();
const readyFrontendHandlers = new Map<string, Set<string>>();
let channelEventHandler: ((name: string, event: string, args: any[]) => void) | null = null;

export const getSocket = (name: string): Socket | undefined => plugins.get(name)?.socket;

const handlerKey = (name: string, method: string) => `${name}\0${method}`;

const readyHandlersFor = (name: string) => {
  let readyHandlers = readyFrontendHandlers.get(name);
  if (!readyHandlers) {
    readyHandlers = new Set<string>();
    readyFrontendHandlers.set(name, readyHandlers);
  }
  return readyHandlers;
};

const rejectDeferred = (deferred: Deferred, e: Error) => {
  deferred.reject(e);
};

const withTimeout = async (promise: Promise<void>, message: string, timeoutMs: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      promise,
      new Promise<void>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

export const addSocket = (name: string, socket: Socket) => {
  setSocket(name, socket);
  socket.on(CHANNEL_EVENT, (payload: { event?: string, args?: any[] }) => {
    if (!payload?.event) {
      return;
    }
    channelEventHandler?.(name, payload.event, payload.args || []);
  });
  socket.on(CHANNEL_HANDLER_READY, (payload: { name?: string }) => {
    if (!payload?.name) {
      return;
    }
    markFrontendHandlerReady(name, payload.name);
  });
  socket.on(CHANNEL_HANDLER_REMOVED, (payload: { name?: string }) => {
    if (!payload?.name) {
      return;
    }
    removeFrontendHandlerReady(name, payload.name);
  });
  socketWaiters.get(name)?.resolve();
  socketWaiters.delete(name);
};

export const removeSocket = (name: string) => {
  setSocket(name, undefined);
  readyFrontendHandlers.delete(name);
  const socketWaiter = socketWaiters.get(name);
  if (socketWaiter) {
    rejectDeferred(socketWaiter, new Error(`插件 ${name} 前端连接已断开`));
    socketWaiters.delete(name);
  }
  for (const [key, waiters] of handlerWaiters) {
    if (!key.startsWith(`${name}\0`)) {
      continue;
    }
    for (const waiter of waiters) {
      rejectDeferred(waiter, new Error(`插件 ${name} 前端 handler 已断开`));
    }
    handlerWaiters.delete(key);
  }
};

export const waitSocketReady = async (name: string, timeoutMs = 20000) => {
  if (getSocket(name)) {
    return;
  }
  let waiter = socketWaiters.get(name);
  if (!waiter) {
    waiter = createDeferred();
    socketWaiters.set(name, waiter);
  }
  await withTimeout(waiter.promise, `插件 ${name} 前端未连接`, timeoutMs);
};

export const markFrontendHandlerReady = (name: string, method: string) => {
  readyHandlersFor(name).add(method);
  const key = handlerKey(name, method);
  const waiters = handlerWaiters.get(key);
  if (!waiters) {
    return;
  }
  for (const waiter of waiters) {
    waiter.resolve();
  }
  handlerWaiters.delete(key);
};

export const removeFrontendHandlerReady = (name: string, method: string) => {
  readyFrontendHandlers.get(name)?.delete(method);
};

export const waitFrontendHandlerReady = async (name: string, method: string, timeoutMs = 20000) => {
  if (readyFrontendHandlers.get(name)?.has(method)) {
    return;
  }
  const key = handlerKey(name, method);
  const waiter = createDeferred();
  const waiters = handlerWaiters.get(key) || [];
  waiters.push(waiter);
  handlerWaiters.set(key, waiters);
  try {
    await withTimeout(waiter.promise, `插件 ${name} 前端 handler 未就绪: ${method}`, timeoutMs);
  } finally {
    const activeWaiters = handlerWaiters.get(key);
    if (activeWaiters) {
      const nextWaiters = activeWaiters.filter(item => item !== waiter);
      if (nextWaiters.length) {
        handlerWaiters.set(key, nextWaiters);
      } else {
        handlerWaiters.delete(key);
      }
    }
  }
};

export const emitEvent = async (name: string, event: string, ...args: any[]): Promise<boolean> => {
  await waitSocketReady(name);
  const socket = getSocket(name);
  if (!socket) {
    throw new Error(`插件 ${name} 前端未连接`);
  }
  return socket.emit(event, ...args);
};

export const setChannelEventHandler = (handler: (name: string, event: string, args: any[]) => void) => {
  channelEventHandler = handler;
};
