import { parentPort, isMainThread } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { MainToWorker, WorkerToMain } from '../worker-protocol';

if (isMainThread || !parentPort) {
  throw new Error('public plugin worker: must run inside worker_threads');
}

const pending = new Map<number, { resolve: (v: unknown) => void, reject: (e: Error) => void }>();
let idSeq = 0;
let instance: any;
let pluginName = '';

function finishBridgeResponse(msg: { id: number, data?: unknown, err?: string }) {
  const p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  if (msg.err) p.reject(new Error(msg.err));
  else p.resolve(msg.data);
}

function makeBridgeRequest<T = unknown>(): { id: number, promise: Promise<T> } {
  idSeq += 1;
  const id = idSeq;
  const promise = new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as any, reject });
  });
  return { id, promise };
}

{
  const b = {
    getPluginName: () => pluginName,
    nodeInvoke: (method: string, args: any[] = [], options: { raw?: boolean } = {}) => {
      const { id, promise } = makeBridgeRequest<unknown>();
      parentPort!.postMessage({
        kind: WorkerToMain.INVOKE_NODE_UTILS,
        id,
        method,
        args,
        options,
      });
      return promise;
    },
    host: (body: Record<string, unknown>) => {
      const { id, promise } = makeBridgeRequest<unknown>();
      parentPort!.postMessage({
        kind: WorkerToMain.INVOKE_HOST,
        id,
        hostPayload: { ...body, pluginName },
      });
      return promise;
    },
  };
  (globalThis as any).__publicTauriNodeBridge = b;
}

parentPort.on('message', async (msg: any) => {
  if (msg === null || msg === undefined) return;
  if (msg.kind === MainToWorker.BRIDGE_RESPONSE) {
    finishBridgeResponse({ id: msg.id, data: msg.data, err: msg.err });
    return;
  }
  if (msg.kind === MainToWorker.LOAD) {
    try {
      pluginName = String(msg.name || '');
      if (!msg.modulePath) {
        instance = null;
        parentPort!.postMessage({ kind: WorkerToMain.LOAD_DONE, ok: true, empty: true, name: pluginName });
        return;
      }
      const fileUrl = pathToFileURL(String(msg.modulePath)).href;
      const mod = await import(fileUrl);
      const factory: any = mod?.default || mod;
      if (typeof factory === 'function') {
        const ctx = {
          emit: (event: string, ...a: any[]) => {
            parentPort!.postMessage({
              kind: WorkerToMain.SOCKET_EMIT,
              name: pluginName,
              event,
              args: a,
            });
          },
        };
        instance = await factory(ctx);
      } else {
        instance = factory;
      }
      parentPort!.postMessage({ kind: WorkerToMain.LOAD_DONE, ok: true, empty: false, name: pluginName });
    } catch (e) {
      instance = null;
      const err = e instanceof Error ? e : new Error(String(e));
      parentPort!.postMessage({ kind: WorkerToMain.LOAD_DONE, ok: false, name: msg.name, error: err.message });
    }
    return;
  }
  if (msg.kind === MainToWorker.INVOKE_EXPORTED) {
    if (!instance) {
      parentPort!.postMessage({ kind: WorkerToMain.INVOKE_EXPORTED_DONE, id: msg.id, err: 'no instance' });
      return;
    }
    if (typeof instance[msg.method] !== 'function') {
      parentPort!.postMessage({ kind: WorkerToMain.INVOKE_EXPORTED_DONE, id: msg.id, err: `无 ${String(msg.method)}` });
      return;
    }
    try {
      const out = await instance[msg.method](...msg.args);
      parentPort!.postMessage({ kind: WorkerToMain.INVOKE_EXPORTED_DONE, id: msg.id, data: out });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      parentPort!.postMessage({ kind: WorkerToMain.INVOKE_EXPORTED_DONE, id: msg.id, err: err.message });
    }
  }
});
