import { Worker } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { emitEvent, getSocket, setChannelEventHandler } from './sockets';
import { runNodeUtilsInvoke } from '../lib/invoke-node-utils';
import { requestHostInvoke, type HostInvokePayload } from './host-bridge';
import { MainToWorker, WorkerToMain } from './worker-protocol';
import { plugins } from './store';

const WORKER_FILE = 'public-plugin-worker.cjs';
const CHANNEL_INVOKE_EVENT = '__public_tauri_channel_invoke__';

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
};

async function runWorkerBridgeInvoke(payload: WorkerBridgePayload): Promise<unknown> {
  if (payload.name === 'clipboard.paste') {
    return runNodeUtilsInvoke('keyboard.press', ['LeftCmd', 'V']);
  }
  const nodeMethod = NODE_API_METHODS[payload.name];
  if (nodeMethod) {
    return runNodeUtilsInvoke(nodeMethod, payload.args || []);
  }
  return requestHostInvoke(payload as HostInvokePayload);
}

function requestFrontendInvoke(name: string, method: string, args: any[], timeoutMs = 20000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = getSocket(name);
    if (!socket) {
      reject(new Error(`插件 ${name} 前端未连接`));
      return;
    }
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

function dispatchEventToPluginWorker(name: string, event: string, args: any[]) {
  const s = plugins.get(name);
  s?.worker?.postMessage({ kind: MainToWorker.CHANNEL_EVENT, event, args });
}

/**
 * 处理子线程发回的消息（命名见 `worker-protocol.ts`）。
 */
async function handleMessageFromPluginWorker(w: Worker, m: { kind: string, [k: string]: any }) {
  if (m === null || m === undefined) {
    return;
  }
  if (m.kind === WorkerToMain.LOAD_DONE) {
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
    await emitEvent(m.name, m.event, ...(m.args || []));
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
  if (s.worker) {
    return callPluginOnWorker(s.worker, method, args);
  }
  throw new Error(`插件 ${name} 未在 Worker 中加载`);
}

function callPluginOnWorker(worker: Worker, method: string, args: any[]) {
  const id = nextCallId();
  return new Promise<unknown>((res, rej) => {
    callPending.set(id, { res, rej });
    worker.postMessage({ kind: MainToWorker.CHANNEL_INVOKE, id, method, args });
  });
}

/**
 * 有 `modulePath` 的插件**仅**在 Worker 中执行；`public-plugin-worker.cjs` 为必构建物。
 */
export const registerPlugin = async (name: string, options: {
  staticPaths?: string[],
  modulePath?: string,
  cwd: string,
}) => {
  if (!options.modulePath) {
    plugins.set(name, {
      staticPaths: options.staticPaths,
      modulePath: options.modulePath,
      cwd: options.cwd,
    });
    return;
  }
  const workerUrl = resolvePluginWorkerModuleUrl();
  if (!workerUrl) {
    throw new Error(`未找到 ${WORKER_FILE}。请在 \`src-node\` 下执行 \`pnpm run build\` 生成 Worker 再启动应用。`);
  }
  const w = new Worker(workerUrl, { name: `p:${name}`, workerData: { name } });
  w.on('error', (e) => {
    console.error(`[public-plugin] worker process error: ${name}`, e);
  });
  w.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[public-plugin] worker exit: ${name}`, code);
    }
  });
  const loadP = new Promise<void>((res, rej) => {
    const to = setTimeout(() => {
      w.terminate();
      rej(new Error('load timeout'));
    }, 120_000);
    w.once('message', (m: any) => {
      clearTimeout(to);
      w.on('message', (m2) => {
        void handleMessageFromPluginWorker(w, m2);
      });
      if (m?.kind === WorkerToMain.LOAD_DONE && m.ok) {
        res();
        return;
      }
      w.terminate();
      rej(new Error(m?.error || 'load fail'));
    });
  });
  w.postMessage({ kind: MainToWorker.LOAD, name, modulePath: options.modulePath });
  try {
    await loadP;
  } catch (e) {
    w.terminate();
    throw e;
  }
  plugins.set(name, {
    staticPaths: options.staticPaths,
    modulePath: options.modulePath,
    worker: w,
    cwd: options.cwd,
  });
};

export const unregisterPlugin = (name: string) => {
  const s = plugins.get(name);
  if (s?.worker) {
    s.worker.terminate();
  }
  plugins.delete(name);
};

export const updatePlugin = (name: string, options: { staticPaths?: string[], modulePath?: string, cwd: string }) => {
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
  dispatchEventToPluginWorker(name, event, args);
});
