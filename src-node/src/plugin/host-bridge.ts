import { getSocket } from './sockets';

const HOST_NAME = '__public_tauri_host__';

export type HostInvokePayload = {
  pluginName: string
  name: string
  args?: unknown[]
};

type Ack = { ok: true, data: unknown } | { ok: false, message: string };

/**
 * RPC 到 Tauri 主窗体。已在 src-node 中实现的应使用 `runNodeUtilsInvoke` / 同进程 `callPlugin`。
 */
export function requestHostInvoke(payload: HostInvokePayload, timeoutMs = 20000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = getSocket(HOST_NAME);
    if (!socket) {
      reject(new Error('Tauri 主窗体未连接，无法执行需前端的操作'));
      return;
    }
    const tid = setTimeout(() => reject(new Error('host invoke 超时')), timeoutMs);
    (socket as any).emit('tauri:host:invoke', payload, (res: Ack | undefined) => {
      clearTimeout(tid);
      if (res == null) {
        reject(new Error('host 无返回'));
        return;
      }
      if (!res.ok) {
        reject(new Error('message' in res ? (res as { message: string }).message : 'host 失败'));
        return;
      }
      resolve((res as { data: unknown }).data);
    });
  });
}
