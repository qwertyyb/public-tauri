// @ts-ignore
import { io } from 'socket.io-client/dist/socket.io.js';

import { SERVER } from './const';
import createLogger from './logger';
import { storage } from './storage';

const logger = createLogger('api.utils');
const CHANNEL_INVOKE_EVENT = '__public_tauri_channel_invoke__';
const CHANNEL_EVENT = '__public_tauri_channel_event__';

export type PluginChannelHandler = (...args: any[]) => any;

export type PluginChannel = {
  invoke: <T = any>(name: string, ...args: any[]) => Promise<T>
  handle: (name: string, callback: PluginChannelHandler) => () => void
  emit: (event: string, ...args: any[]) => void
  on: (event: string, callback: (...args: any[]) => void) => () => void
  once: (event: string, callback: (...args: any[]) => void) => () => void
  off: (event: string, callback: (...args: any[]) => void) => void
};

export const invokePluginServerMethod: <T extends any>(name: string, method: string, args: any[]) => Promise<T> = logger.wrap(
  'invokePluginServerMethod',
  async (name: string, method: string, args: any[]) => {
    const r = await window.fetch(`${SERVER}/api/manager/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, method, args }),
    });
    const { data, errCode, errMsg } = await r.json();
    if (errCode === 0) {
      return data;
    }
    throw new Error(`${name}调用${method}失败: ${errMsg} ${errCode}`);
  },
);

export const createPluginStorage = (name: string) => {
  const getKey = (key: string) => `${name}:${key}`;
  return {
    getItem(key: string) {
      return storage.getItem(getKey(key));
    },
    setItem(key: string, value: any) {
      return storage.setItem(getKey(key), value);
    },
    allItems() {
      return storage.allItems(`${name}:`);
    },
    clear() {
      return storage.clear(`${name}:`);
    },
    removeItem(key: string) {
      return storage.removeItem(getKey(key));
    },
  };
};

export const registerServerModule = logger.wrap(
  'registerServerModule',
  async (name: string, { modulePath, staticPaths }: { modulePath: string, staticPaths: string[] }) => {
    const r = await window.fetch(`${SERVER}/api/manager/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, modulePath, staticPaths }),
    });
    const { errCode, errMsg, data } = await r.json();
    if (errCode !== 0) {
      throw new Error(`注册服务插件${name}失败:${errMsg} ${errCode}`);
    }
    return data;
  },
);

export const createPluginServerListener = logger.wrap(
  'createPluginServerListener',
  (pluginName: string) => {
    const socket = io(SERVER, {
      path: '/socket.io',
      query: {
        name: pluginName,
      },
    });
    return (event: string, callback: (data: any) => void) => {
      socket.on(event, callback);
    };
  },
);

export const createPluginChannel = logger.wrap(
  'createPluginChannel',
  (pluginName: string): PluginChannel => {
    const socket = io(SERVER, {
      path: '/socket.io',
      query: {
        name: pluginName,
      },
    });
    const handlers = new Map<string, PluginChannelHandler>();

    socket.on(CHANNEL_INVOKE_EVENT, async (
      payload: { name?: string, args?: any[] },
      ack?: (response: { ok: true, data: unknown } | { ok: false, message: string }) => void,
    ) => {
      if (!ack) {
        return;
      }
      const name = payload?.name;
      const handler = name ? handlers.get(name) : undefined;
      if (!name || !handler) {
        ack({ ok: false, message: `frontend handler not found: ${name || '<empty>'}` });
        return;
      }
      try {
        const data = await handler(...(payload.args || []));
        ack({ ok: true, data });
      } catch (e) {
        ack({ ok: false, message: e instanceof Error ? e.message : String(e) });
      }
    });

    return {
      invoke: <T = any>(name: string, ...args: any[]) => invokePluginServerMethod<T>(pluginName, name, args),
      handle: (name: string, callback: PluginChannelHandler) => {
        handlers.set(name, callback);
        return () => {
          if (handlers.get(name) === callback) {
            handlers.delete(name);
          }
        };
      },
      emit: (event: string, ...args: any[]) => {
        socket.emit(CHANNEL_EVENT, { event, args });
      },
      on: (event: string, callback: (...args: any[]) => void) => {
        socket.on(event, callback);
        return () => socket.off(event, callback);
      },
      once: (event: string, callback: (...args: any[]) => void) => {
        socket.once(event, callback);
        return () => socket.off(event, callback);
      },
      off: (event: string, callback: (...args: any[]) => void) => {
        socket.off(event, callback);
      },
    };
  },
);
