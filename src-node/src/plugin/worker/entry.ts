import { parentPort, isMainThread } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { MainToWorker, WorkerToMain } from '../worker-protocol';

if (isMainThread || !parentPort) {
  throw new Error('public plugin worker: must run inside worker_threads');
}

/** 未捕获的 bridge rejection 仍应记录；默认行为可能结束线程，此处覆盖为仅打印（await 路径不受影响）。 */
process.on('unhandledRejection', (reason) => {
  console.error('[public-plugin-worker] unhandledRejection', reason);
});

let pluginName = '';

async function handleLoadMessage(msg: any) {
  pluginName = String(msg.name || '');
  if (!msg.modulePath) {
    parentPort!.postMessage({ kind: WorkerToMain.LOAD_DONE, ok: true, empty: true, name: pluginName });
    return;
  }
  const fileUrl = pathToFileURL(String(msg.modulePath)).href;
  await import(fileUrl);
  parentPort!.postMessage({ kind: WorkerToMain.LOAD_DONE, ok: true, empty: false, name: pluginName });
}

parentPort.on('message', (msg: any) => {
  if (msg === null || msg === undefined) return;
  if (msg.kind !== MainToWorker.LOAD) return;
  void handleLoadMessage(msg).catch((e) => {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[public-plugin-worker] LOAD failed', err);
    try {
      parentPort!.postMessage({
        kind: WorkerToMain.LOAD_DONE,
        ok: false,
        name: msg.name,
        error: err.message,
      });
    } catch {
      /* MessagePort 可能已关闭 */
    }
  });
});
