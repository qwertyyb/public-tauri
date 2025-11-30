// @ts-ignore
import { io } from 'socket.io-client/dist/socket.io.js';

import { SERVER } from './const';
import createLogger from './logger';
import { storage } from './storage';

const logger = createLogger('api.utils');

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

export const invokeServerUtils = logger.wrap(
  'invokeServerUtils',
  async (method: string, args: any[] = [], options = { raw: false }) => {
    const r = await window.fetch(`${SERVER}/utils/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ method, args }),
    });
    if (options.raw) {
      return r;
    }
    const { data, errCode, errMsg } = await r.json();
    if (errCode === 0) {
      return data;
    }
    throw new Error(`调用 utils ${method}失败: ${errMsg} ${errCode}`);
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
  (pluginName: string) => ({
    invoke: <T = any>(name: string, ...args: any[]) => invokePluginServerMethod<T>(pluginName, name, args),
    on: createPluginServerListener(pluginName),
  }),
);

export const getPressedKeys = (event: KeyboardEvent) => {
  const detectKeys = ['Meta', 'Control', 'Alt', 'Shift'];
  const modifiers = detectKeys.filter(key => event.getModifierState(key));
  const isModifierKeyDown = detectKeys.includes(event.key); // 当前按下的是否就是修饰键
  const keys = isModifierKeyDown ? [...modifiers] : [...modifiers, event.key];
  return keys;
};

export const isKeyPressed = (event: KeyboardEvent, value: string | string[]) => {
  const pressedKeys = getPressedKeys(event);
  const valueKeys = typeof value === 'string' ? value.split('+') : [...value];
  return pressedKeys.sort().join('+') === valueKeys.sort().join('+');
};
