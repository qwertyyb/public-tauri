import { parentPort, isMainThread, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { WorkerToMain } from '../worker-protocol';

if (isMainThread || !parentPort) {
  throw new Error('public plugin worker: must run inside worker_threads');
}

/** 未捕获的 bridge rejection 仍应记录；默认行为可能结束线程，此处覆盖为仅打印（await 路径不受影响）。 */
process.on('unhandledRejection', (reason) => {
  console.error('[public-plugin-worker] unhandledRejection', reason);
});

type WorkerBootstrapData = {
  name?: string
  modulePath?: string
};

void (async () => {
  const wd = workerData as WorkerBootstrapData;
  const pluginName = String(wd.name || '');
  const modulePath = wd.modulePath;

  if (!modulePath) {
    parentPort!.postMessage({ kind: WorkerToMain.BOOT_READY, ok: true, empty: true, name: pluginName });
    return;
  }

  try {
    const fileUrl = pathToFileURL(String(modulePath)).href;
    await import(fileUrl);
    parentPort!.postMessage({ kind: WorkerToMain.BOOT_READY, ok: true, empty: false, name: pluginName });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[public-plugin-worker] BOOT import failed', err);
    try {
      parentPort!.postMessage({
        kind: WorkerToMain.BOOT_READY,
        ok: false,
        name: pluginName,
        error: err.message,
      });
    } catch {
      /* MessagePort 可能已关闭 */
    }
  }
})();
