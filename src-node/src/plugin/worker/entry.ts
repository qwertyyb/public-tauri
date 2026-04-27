import { parentPort, isMainThread } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { MainToWorker, WorkerToMain } from '../worker-protocol';

if (isMainThread || !parentPort) {
  throw new Error('public plugin worker: must run inside worker_threads');
}

let pluginName = '';

parentPort.on('message', async (msg: any) => {
  if (msg === null || msg === undefined) return;
  if (msg.kind === MainToWorker.LOAD) {
    try {
      pluginName = String(msg.name || '');
      if (!msg.modulePath) {
        parentPort!.postMessage({ kind: WorkerToMain.LOAD_DONE, ok: true, empty: true, name: pluginName });
        return;
      }
      const fileUrl = pathToFileURL(String(msg.modulePath)).href;
      await import(fileUrl);
      parentPort!.postMessage({ kind: WorkerToMain.LOAD_DONE, ok: true, empty: false, name: pluginName });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      parentPort!.postMessage({ kind: WorkerToMain.LOAD_DONE, ok: false, name: msg.name, error: err.message });
    }
  }
});
