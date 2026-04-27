import { io } from 'socket.io-client/dist/socket.io.js';
import { SERVER } from '@public/core/const';
import * as core from '@public/core';
import { invoke } from '@tauri-apps/api/core';

const HOST_CLIENT_NAME = '__public_tauri_host__';

function getTarget(objectPath: string[]) {
  let o: any = core;
  for (const k of objectPath) {
    o = o[k];
    if (o == null) {
      throw new Error(`@public/core 上不存在 ${objectPath.join('.')}`);
    }
  }
  return o;
}

async function runCoreApply(objectPath: string[], args: unknown[]) {
  if (objectPath.length < 1) {
    throw new Error('core-apply: empty path');
  }
  if (objectPath.length === 1) {
    const top = (core as any)[objectPath[0]!];
    if (typeof top === 'function') {
      return await (top as (...a: any[]) => any)(...args);
    }
  }
  const name = objectPath[objectPath.length - 1]!;
  const parent = getTarget(objectPath.slice(0, -1));
  const fn = parent[name];
  if (typeof fn !== 'function') {
    throw new Error(`${objectPath.join('.')} 非函数`);
  }
  return await fn.apply(parent, args);
}

let socket: ReturnType<typeof io> | null = null;

/**
 * 与 `src-node` 中 `getSocket('__public_tauri_host__')` 对应；供插件 Node Worker 经 Socket 调 Tauri/壳层 API。
 */
export function connectTauriNodeHostSocket() {
  if (socket?.connected) {
    return;
  }
  socket = io(SERVER, {
    path: '/socket.io',
    query: { name: HOST_CLIENT_NAME },
  });
  socket.on(
    'tauri:host:invoke',
    async (payload: {
      op: 'core-apply' | 'tauri:invoke'
      objectPath?: string[]
      args?: unknown[]
      cmd?: string
      invokeArgs?: Record<string, unknown>
    }, ack?: (r: { ok: true, data: unknown } | { ok: false, message: string }) => void) => {
      if (!ack) {
        return;
      }
      try {
        if (payload?.op === 'tauri:invoke' && payload.cmd) {
          const { cmd, invokeArgs } = payload;
          const data = invokeArgs && Object.keys(invokeArgs).length
            ? await invoke(cmd, invokeArgs)
            : await (invoke as (c: string) => Promise<unknown>)(cmd);
          ack({ ok: true, data });
          return;
        }
        if (payload?.op === 'core-apply' && payload.objectPath) {
          const data = await runCoreApply(payload.objectPath, payload.args || []);
          ack({ ok: true, data });
          return;
        }
        ack({ ok: false, message: 'invalid host payload' });
      } catch (e) {
        ack({ ok: false, message: e instanceof Error ? e.message : String(e) });
      }
    },
  );
}
