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
  /** 调用 Worker 中注册的 channel handler */
  CHANNEL_INVOKE: 'm2w:channelInvoke',
  /** 向 Worker 中注册的 channel event listener 投递事件 */
  CHANNEL_EVENT: 'm2w:channelEvent',
  /**
   * 回应 Worker 的 bridge 请求：父进程分派完成后的结果/错误
   * 与 WorkerToMain 中带 requestId 的 *请求* 成对出现
   */
  BRIDGE_RESPONSE: 'm2w:bridgeResponse',
} as const;

export type MainToWorkerKind = (typeof MainToWorker)[keyof typeof MainToWorker];

/** 插件 Worker → 父进程 */
export const WorkerToMain = {
  /** LOAD 成功或失败 */
  LOAD_DONE: 'w2m:loadDone',
  /** Worker 发起宿主能力调用，由父进程决定走 Node utils 还是 Host 窗口 */
  INVOKE_BRIDGE: 'w2m:invokeBridge',
  /** Worker 调用前端 `channel.handle` 注册的方法 */
  CHANNEL_INVOKE: 'w2m:channelInvoke',
  /** Worker 发事件给前端 `channel.on` / `once` */
  CHANNEL_EMIT: 'w2m:channelEmit',
  /** 对 `CHANNEL_INVOKE` 的完成（一个 channel invoke 的回应） */
  CHANNEL_INVOKE_DONE: 'w2m:channelInvokeDone',
} as const;

export type WorkerToMainKind = (typeof WorkerToMain)[keyof typeof WorkerToMain];
