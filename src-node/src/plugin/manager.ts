import { Worker } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { emitEvent, getSocket, removeSocket, setChannelEventHandler, waitFrontendHandlerReady, waitSocketReady } from './sockets';
import { runNodeUtilsInvoke } from '../lib/invoke-node-utils';
import { requestHostInvoke, type HostInvokePayload } from './host-bridge';
import { MainToWorker, WorkerToMain } from './worker-protocol';
import { plugins } from './store';
import type { PluginState } from './store';

const WORKER_FILE = 'public-plugin-worker.cjs';
const CHANNEL_INVOKE_EVENT = '__public_tauri_channel_invoke__';
const WORKER_BOOT_TIMEOUT_MS = 120_000;

/** 插件 Worker 为独立 CJS 产物；主进程 sidecar 也是 CJS，避免混用加载模式。 */
function resolvePluginWorkerModuleUrl() {
  let abs: string | null = null;
  if (typeof __filename !== 'undefined') {
    const byDist = join(dirname(__filename), WORKER_FILE);
    if (existsSync(byDist)) {
      abs = byDist;
    }
  }
  if (!abs) {
    const here = dirname(fileURLToPath(import.meta.url));
    const fromDist = join(here, '../../dist', WORKER_FILE);
    if (existsSync(fromDist)) {
      abs = fromDist;
    }
  }
  if (!abs) {
    return null;
  }
  return pathToFileURL(abs);
}

const callPending = new Map<number, { res: (v: unknown) => void, rej: (e: Error) => void }>();
let callId = 0;
const nextCallId = () => {
  callId += 1;
  return callId;
};

type Ack = { ok: true, data: unknown } | { ok: false, message: string };
type WorkerBridgePayload = {
  pluginName: string
  name: string
  args?: any[]
};

const NODE_API_METHODS: Record<string, string | undefined> = {
  'utils.getCurrentPath': 'system.getCurrentPath',
  'utils.getSelectedPath': 'system.getSelectedPath',
  'utils.getSelectedText': 'system.getSelectedText',
  'utils.runCommand': 'system.runCommand',
  'utils.runAppleScript': 'system.runAppleScript',
  'storage.getItem': 'storage.getItem',
  'storage.setItem': 'storage.setItem',
  'storage.allItems': 'storage.allItems',
  'storage.removeItem': 'storage.removeItem',
  'storage.clear': 'storage.clear',
};

const withPluginStoragePrefix = (pluginName: string, key: unknown) => {
  const suffix = key === undefined || key === null ? '' : String(key);
  return suffix ? `${pluginName}:${suffix}` : `${pluginName}:`;
};

const remapStorageArgs = (payload: WorkerBridgePayload) => {
  const [arg0, arg1] = payload.args || [];
  switch (payload.name) {
    case 'storage.getItem':
      return [withPluginStoragePrefix(payload.pluginName, arg0)];
    case 'storage.setItem':
      return [withPluginStoragePrefix(payload.pluginName, arg0), arg1];
    case 'storage.removeItem':
      return [withPluginStoragePrefix(payload.pluginName, arg0)];
    case 'storage.allItems':
      return [withPluginStoragePrefix(payload.pluginName, arg0)];
    case 'storage.clear':
      return [withPluginStoragePrefix(payload.pluginName, arg0)];
    default:
      return payload.args || [];
  }
};

async function runWorkerBridgeInvoke(payload: WorkerBridgePayload): Promise<unknown> {
  if (payload.name === 'clipboard.paste') {
    return runNodeUtilsInvoke('keyboard.press', ['LeftCmd', 'V']);
  }
  const nodeMethod = NODE_API_METHODS[payload.name];
  if (nodeMethod) {
    const args = payload.name.startsWith('storage.')
      ? remapStorageArgs(payload)
      : (payload.args || []);
    return runNodeUtilsInvoke(nodeMethod, args);
  }
  return requestHostInvoke(payload as HostInvokePayload);
}

async function requestFrontendInvoke(name: string, method: string, args: any[], timeoutMs = 20000): Promise<unknown> {
  await waitSocketReady(name, timeoutMs);
  await waitFrontendHandlerReady(name, method, timeoutMs);
  const socket = getSocket(name);
  if (!socket) {
    throw new Error(`插件 ${name} 前端未连接`);
  }
  return new Promise((resolve, reject) => {
    const tid = setTimeout(() => reject(new Error(`frontend invoke timeout: ${method}`)), timeoutMs);
    socket.emit(CHANNEL_INVOKE_EVENT, { name: method, args }, (res: Ack | undefined) => {
      clearTimeout(tid);
      if (res === null || res === undefined) {
        reject(new Error('frontend handler 无返回'));
        return;
      }
      if (!res.ok) {
        reject(new Error('message' in res ? res.message : 'frontend handler failed'));
        return;
      }
      resolve(res.data);
    });
  });
}

/**
 * 创建 Worker、`import(modulePath)` 直至 BOOT_READY；失败时保留插件元数据并写入 serverReadyError。
 */
async function startPluginWorkerInternal(name: string): Promise<void> {
  let state = plugins.get(name);
  if (!state?.modulePath) {
    throw new Error(`插件 ${name} 未配置 server module`);
  }
  if (state.worker && state.serverReady) {
    return;
  }

  const workerUrl = resolvePluginWorkerModuleUrl();
  if (!workerUrl) {
    throw new Error(`未找到 ${WORKER_FILE}。请在 \`src-node\` 下执行 \`pnpm run build\` 生成 Worker 再启动应用。`);
  }

  const { modulePath } = state;
  const w = new Worker(workerUrl, {
    name: `p:${name}`,
    workerData: { name, modulePath },
    stdout: true,
    stderr: true,
  });

  state.worker = w;
  state.serverReady = false;
  state.serverReadyError = undefined;

  w.on('error', (e) => {
    console.error(`[public-plugin] worker process error: ${name}`, e);
  });

  w.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[public-plugin] worker exit: ${name}`, code);
    }
    const st = plugins.get(name);
    if (!st) return;
    resetPluginWorkerLifecycle(st);
  });

  const loadP = new Promise<void>((res, rej) => {
    const to = setTimeout(() => {
      w.terminate();
      rej(new Error('Worker boot timeout'));
    }, WORKER_BOOT_TIMEOUT_MS);
    const onMessage = (m: any) => {
      if (m?.kind !== WorkerToMain.BOOT_READY) {
        void handleMessageFromPluginWorker(w, m);
        return;
      }
      clearTimeout(to);
      w.off('message', onMessage);
      w.on('message', (m2) => {
        void handleMessageFromPluginWorker(w, m2);
      });
      if (m.ok) {
        res();
        return;
      }
      w.terminate();
      rej(new Error(m?.error || 'Worker boot failed'));
    };
    w.on('message', onMessage);
  });

  try {
    await loadP;
    state = plugins.get(name);
    if (state) {
      state.serverReady = true;
      state.serverReadyError = undefined;
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    state = plugins.get(name);
    if (state) {
      state.serverReadyError = err.message;
      state.serverReady = false;
      if (state.worker === w) {
        state.worker = undefined;
      }
    }
    try {
      w.terminate();
    } catch {
      /* ignore */
    }
    throw err;
  }
}

async function ensurePluginWorker(name: string): Promise<void> {
  const s = plugins.get(name);
  if (!s?.modulePath) {
    throw new Error(`插件 ${name} 未配置 server module`);
  }
  if (s.worker && s.serverReady) {
    return;
  }

  if (!s.workerBootPromise) {
    s.workerBootPromise = startPluginWorkerInternal(name);
  }

  const bootP = s.workerBootPromise;
  try {
    await bootP;
  } finally {
    const cur = plugins.get(name);
    if (cur?.workerBootPromise === bootP) {
      cur.workerBootPromise = undefined;
    }
  }
}

async function dispatchEventToPluginWorker(name: string, event: string, args: any[]) {
  const s = plugins.get(name);
  if (!s?.modulePath) {
    return;
  }
  try {
    await ensurePluginWorker(name);
  } catch (e) {
    console.warn(`[public-plugin] ensure worker for channel event failed: ${name}.${event}`, e);
    return;
  }
  const w = plugins.get(name)?.worker;
  w?.postMessage({ kind: MainToWorker.CHANNEL_EVENT, event, args });
}

/**
 * 处理子线程发回的消息（命名见 `worker-protocol.ts`）。
 */
async function handleMessageFromPluginWorker(w: Worker, m: { kind: string, [k: string]: any }) {
  if (m === null || m === undefined) {
    return;
  }
  if (m.kind === WorkerToMain.INVOKE_BRIDGE) {
    try {
      const data = await runWorkerBridgeInvoke(m.bridgePayload as WorkerBridgePayload);
      w.postMessage({ kind: MainToWorker.BRIDGE_RESPONSE, id: m.id, data });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      w.postMessage({ kind: MainToWorker.BRIDGE_RESPONSE, id: m.id, err });
    }
    return;
  }
  if (m.kind === WorkerToMain.CHANNEL_EMIT) {
    try {
      await emitEvent(m.name, m.event, ...(m.args || []));
    } catch (e) {
      console.warn(`[public-plugin] frontend event dropped: ${m.name}.${m.event}`, e);
    }
    return;
  }
  if (m.kind === WorkerToMain.CHANNEL_INVOKE) {
    try {
      const data = await requestFrontendInvoke(m.name, m.method, m.args || []);
      w.postMessage({ kind: MainToWorker.BRIDGE_RESPONSE, id: m.id, data });
    } catch (e) {
      w.postMessage({ kind: MainToWorker.BRIDGE_RESPONSE, id: m.id, err: e instanceof Error ? e.message : String(e) });
    }
    return;
  }
  if (m.kind === WorkerToMain.CHANNEL_INVOKE_DONE && typeof m.id === 'number') {
    const c = callPending.get(m.id);
    if (c) {
      callPending.delete(m.id);
      if (m.err) c.rej(new Error(m.err));
      else c.res(m.data);
    }
  }
}

async function callRegisteredPlugin(name: string, method: string, args: any[]) {
  const s = plugins.get(name);
  if (!s) {
    throw new Error(`插件 ${name} 不存在`);
  }
  if (!s.modulePath) {
    throw new Error(`插件 ${name} 未配置 server module`);
  }
  await ensurePluginWorker(name);
  const after = plugins.get(name);
  if (!after) {
    throw new Error(`插件 ${name} 不存在`);
  }
  if (after.serverReadyError) {
    throw new Error(`插件 ${name} server module 加载失败: ${after.serverReadyError}`);
  }
  if (!after.worker || !after.serverReady) {
    throw new Error(`插件 ${name} 未在 Worker 中加载`);
  }
  return callPluginOnWorker(after.worker, method, args);
}

function callPluginOnWorker(worker: Worker, method: string, args: any[]) {
  const id = nextCallId();
  return new Promise<unknown>((res, rej) => {
    callPending.set(id, { res, rej });
    worker.postMessage({ kind: MainToWorker.CHANNEL_INVOKE, id, method, args });
  });
}

/** Worker 生命周期结束：清空 worker 与就绪状态（不把运行时 error 混进持久 serverReadyError）。 */
function resetPluginWorkerLifecycle(state: PluginState) {
  state.worker = undefined;
  state.serverReady = false;
  state.workerBootPromise = undefined;
  state.serverReadyError = undefined;
}

/**
 * 有 `modulePath` 的插件**仅**在 Worker 中执行（按需启动）；`public-plugin-worker.cjs` 为必构建物。
 * 注册阶段只写入元数据；首次 `invoke` 或 Socket `CHANNEL_EVENT` 时再 `ensurePluginWorker`。
 */
export const registerPlugin = async (name: string, options: {
  staticPaths?: string[],
  modulePath?: string,
  cwd?: string,
}) => {
  if (!options.modulePath) {
    plugins.set(name, {
      staticPaths: options.staticPaths,
      modulePath: options.modulePath,
      cwd: options.cwd,
      serverReady: true,
    });
    return;
  }
  const workerUrl = resolvePluginWorkerModuleUrl();
  if (!workerUrl) {
    throw new Error(`未找到 ${WORKER_FILE}。请在 \`src-node\` 下执行 \`pnpm run build\` 生成 Worker 再启动应用。`);
  }
  plugins.set(name, {
    staticPaths: options.staticPaths,
    modulePath: options.modulePath,
    cwd: options.cwd,
    serverReady: false,
    serverReadyError: undefined,
  });
};

export const unregisterPlugin = (name: string) => {
  const s = plugins.get(name);
  if (s?.socket) {
    s.socket.disconnect(true);
  }
  removeSocket(name);
  if (s?.worker) {
    s.worker.terminate();
  }
  plugins.delete(name);
};

export const updatePlugin = (name: string, options: { staticPaths?: string[], modulePath?: string, cwd?: string }) => {
  unregisterPlugin(name);
  return registerPlugin(name, {
    staticPaths: options.staticPaths,
    modulePath: options.modulePath ? `${options.modulePath}?_t=${Math.random()}` : options.modulePath,
    cwd: options.cwd,
  });
};

export const callPlugin = (name: string, method: string, args: any[]) => callRegisteredPlugin(name, method, args);

export { plugins };

setChannelEventHandler((name, event, args) => {
  void dispatchEventToPluginWorker(name, event, args).catch((e) => {
    console.warn(`[public-plugin] dispatch event to worker failed: ${name}.${event}`, e);
  });
});
