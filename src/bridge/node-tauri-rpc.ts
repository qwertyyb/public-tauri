// @ts-ignore
import { io } from 'socket.io-client/dist/socket.io.js';
import { SERVER } from '@public-tauri/core/const';
import { invokePluginFrontendApi } from '@/plugin/frontend-api-registry';

const HOST_CLIENT_NAME = '__public_tauri_host__';
type HostInvokePayload = {
  pluginName?: string
  name?: string
  args?: unknown[]
};

async function runPluginApi(payload: HostInvokePayload) {
  const { pluginName, name, args = [] } = payload;
  if (!name) {
    throw new Error('invalid host payload');
  }
  if (!pluginName) {
    throw new Error(`plugin frontend API ${name} 缺少 pluginName`);
  }
  return await invokePluginFrontendApi(pluginName, name, args);
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
    async (payload: HostInvokePayload, ack?: (r: { ok: true, data: unknown } | { ok: false, message: string }) => void) => {
      if (!ack) {
        return;
      }
      try {
        const data = await runPluginApi(payload || {});
        ack({ ok: true, data });
      } catch (e) {
        ack({ ok: false, message: e instanceof Error ? e.message : String(e) });
      }
    },
  );
}
