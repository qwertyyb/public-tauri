/**
 * 主线程 (Koa) ↔ 插件 Worker 之间的 postMessage 协议。
 *
 * 使用单一字段 `kind` 作判别；字符串值为稳定前缀，便于在调试器与日志中识别。
 *（早期实现曾用 t/type 混用和 U/A 等单字母，已废弃。）
 */

/** 父进程 → 插件 Worker */
export const MainToWorker = {
  /** 加载/重载 `modulePath` 上的插件模块 */
  LOAD: 'm2w:load',
  /** 调用 `instance[method](...args)`，对应 HTTP `/api/manager/invoke` */
  INVOKE_EXPORTED: 'm2w:invokeExported',
  /**
   * 回应 Worker 的 bridge 请求：执行完 runNodeUtilsInvoke 或 requestHostInvoke 后的结果/错误
   * 与 WorkerToMain 中带 requestId 的 *请求* 成对出现
   */
  BRIDGE_RESPONSE: 'm2w:bridgeResponse',
} as const;

export type MainToWorkerKind = (typeof MainToWorker)[keyof typeof MainToWorker];

/** 插件 Worker → 父进程 */
export const WorkerToMain = {
  /** LOAD 成功或失败 */
  LOAD_DONE: 'w2m:loadDone',
  /**
   * 在父进程跑与 `POST /utils/invoke` 等价的逻辑 (runNodeUtilsInvoke)，不经过 Tauri
   * 见 packages/api 的 A 类 API
   */
  INVOKE_NODE_UTILS: 'w2m:invokeNodeUtils',
  /**
   * 在父进程经 Socket 调 Tauri 主窗 (requestHostInvoke)，B 类 API
   */
  INVOKE_HOST: 'w2m:invokeHost',
  /**
   * 子线程 context.emit，父进程里转发到 socket.io
   * payload: { name, event, args } 在消息顶层或嵌套
   */
  SOCKET_EMIT: 'w2m:socketEmit',
  /** 对 `INVOKE_EXPORTED` 的完成（一个 HTTP invoke 的回应） */
  INVOKE_EXPORTED_DONE: 'w2m:invokeExportedDone',
} as const;

export type WorkerToMainKind = (typeof WorkerToMain)[keyof typeof WorkerToMain];
