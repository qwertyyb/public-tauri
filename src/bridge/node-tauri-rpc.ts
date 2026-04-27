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

const TAURI_API_COMMANDS: Record<string, ((args: unknown[]) => { cmd: string, invokeArgs?: Record<string, unknown> }) | undefined> = {
  'utils.getFrontmostApplication': () => ({ cmd: 'get_frontmost_application', invokeArgs: {} }),
  'utils.getDefaultApplication': args => ({ cmd: 'get_default_application', invokeArgs: { fileOrUrl: args[0] } }),
  'utils.getApplications': args => ({ cmd: 'get_application', invokeArgs: { fileOrUrl: args[0] } }),
  'permissions.checkAll': () => ({ cmd: 'check_permissions', invokeArgs: {} }),
  'permissions.checkAccessibility': () => ({ cmd: 'check_accessibility_permission', invokeArgs: {} }),
  'permissions.checkAppleScript': () => ({ cmd: 'check_applescript_permission', invokeArgs: {} }),
  'permissions.checkScreenRecording': () => ({ cmd: 'check_screen_recording_permission', invokeArgs: {} }),
  'permissions.openAccessibilitySettings': () => ({ cmd: 'open_accessibility_settings', invokeArgs: {} }),
  'permissions.openScreenRecordingSettings': () => ({ cmd: 'open_screen_recording_settings', invokeArgs: {} }),
  'permissions.openAutomationSettings': () => ({ cmd: 'open_automation_settings', invokeArgs: {} }),
};

function corePathForApiName(name: string) {
  const [scope, method] = name.split('.');
  if (!scope || !method) {
    return null;
  }
  if (['mainWindow', 'screen', 'dialog', 'clipboard'].includes(scope)) {
    return [scope, method];
  }
  if (name === 'utils.getMousePosition') {
    return ['utils', 'getMousePosition'];
  }
  return null;
}

async function runPluginApi(name: string, args: unknown[]) {
  const tauriCommand = TAURI_API_COMMANDS[name]?.(args);
  if (tauriCommand) {
    const { cmd, invokeArgs } = tauriCommand;
    return invokeArgs && Object.keys(invokeArgs).length
      ? await invoke(cmd, invokeArgs)
      : await (invoke as (c: string) => Promise<unknown>)(cmd);
  }
  const corePath = corePathForApiName(name);
  if (corePath) {
    return await runCoreApply(corePath, args);
  }
  throw new Error(`unsupported plugin API: ${name}`);
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
      name?: string
      args?: unknown[]
    }, ack?: (r: { ok: true, data: unknown } | { ok: false, message: string }) => void) => {
      if (!ack) {
        return;
      }
      try {
        if (payload?.name) {
          const data = await runPluginApi(payload.name, payload.args || []);
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
