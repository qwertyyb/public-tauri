/**
 * 日志对象提供 debug、info、warn、error 方法，分别对应不同级别的日志输出。
 * 提供 createLogger 方法，支持传入 namespace 参数，用于区分不同模块的日志, namespace 应当是字符串类型，日志在输出时，带上 namespace 前缀
 * 提供 setLevel 方法，支持传入 level 参数，用于设置日志的输出级别，level 的取值为 debug、info、warn、error，默认输出所有级别的日志
 * 提供控制 namespace 的功能，支持传入 namespace 参数，用于设置启用的 namespace，默认启用所有 namespace
 * 日志对象除了以上方法外，还提供 wrap 方法，用于包装一个函数，在函数执行前输出日志，在函数执行后输出日志，用于跟踪函数的执行过程
 */

// 日志级别枚举
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 日志级别权重映射
const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 日志级别颜色映射
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#888888',
  info: '#2E86C1',
  warn: '#D68910',
  error: '#E74C3C',
};

// 全局配置
interface LoggerConfig {
  level: LogLevel;
  enabledNamespaces: Set<string> | 'all';
  enableColors: boolean;
  timestamp: boolean;
}

// 默认配置
const defaultConfig: LoggerConfig = {
  level: 'debug',
  enabledNamespaces: 'all',
  enableColors: true,
  timestamp: true,
};

// 全局配置实例
let globalConfig: LoggerConfig = { ...defaultConfig };

// 日志记录器接口
export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  wrap<F extends (...args: any[]) => any>(name: string, fn: F): (...args: Parameters<F>) => ReturnType<F>;
}

// 检查是否应该记录日志
function shouldLog(level: LogLevel, namespace: string): boolean {
  // 检查级别
  if (LEVEL_WEIGHTS[level] < LEVEL_WEIGHTS[globalConfig.level]) {
    return false;
  }

  // 检查命名空间
  if (globalConfig.enabledNamespaces !== 'all') {
    return globalConfig.enabledNamespaces.has(namespace);
  }

  return true;
}

// 格式化时间戳
function formatTimestamp(): string {
  return new Date().toISOString();
}

// 格式化日志消息
function formatMessage(level: LogLevel, namespace: string, args: any[]): any[] {
  const parts: string[] = [];

  // 时间戳
  if (globalConfig.timestamp) {
    parts.push(`[${formatTimestamp()}]`);
  }

  // 级别标签
  if (globalConfig.enableColors) {
    parts.push(`%c${level.toUpperCase()}%c`);
  } else {
    parts.push(`[${level.toUpperCase()}]`);
  }

  // 命名空间
  parts.push(`[${namespace}]`);

  // 消息内容
  const message = parts.join(' ');

  if (globalConfig.enableColors) {
    return [message, `color: ${LEVEL_COLORS[level]}; font-weight: bold`, 'color: inherit', ...args];
  }

  return [message, ...args];
}

// 创建日志记录器
export function createLogger(namespace: string): Logger {
  if (!namespace || typeof namespace !== 'string') {
    throw new Error('Namespace must be a non-empty string');
  }

  const logger: Logger = {
    debug(...args: any[]) {
      if (shouldLog('debug', namespace)) {
        const formatted = formatMessage('debug', namespace, args);
        if (globalConfig.enableColors && Array.isArray(formatted)) {
          console.debug(...formatted);
        } else {
          console.debug(formatted);
        }
      }
    },

    info(...args: any[]) {
      if (shouldLog('info', namespace)) {
        const formatted = formatMessage('info', namespace, args);
        if (globalConfig.enableColors && Array.isArray(formatted)) {
          console.info(...formatted);
        } else {
          console.info(formatted);
        }
      }
    },

    warn(...args: any[]) {
      if (shouldLog('warn', namespace)) {
        const formatted = formatMessage('warn', namespace, args);
        if (globalConfig.enableColors && Array.isArray(formatted)) {
          console.warn(...formatted);
        } else {
          console.warn(formatted);
        }
      }
    },

    error(...args: any[]) {
      if (shouldLog('error', namespace)) {
        const formatted = formatMessage('error', namespace, args);
        if (globalConfig.enableColors && Array.isArray(formatted)) {
          console.error(...formatted);
        } else {
          console.error(formatted);
        }
      }
    },

    wrap(name, fn) {
      return (...args) => {
        // 获取唯一ID
        const uuid = crypto.randomUUID();
        this.debug(`${name} called with args:`, args, `uuid: ${uuid}`);
        const result = fn(...args);
        if (result instanceof Promise) {
          result.catch((err) => {
            this.error(`${name} failed:`, err, `uuid: ${uuid}`);
            throw err;
          }).then((res) => {
            this.debug(`${name} returned:`, res, `uuid: ${uuid}`);
            return res;
          });
        } else {
          this.debug(`${name} returned:`, result, `uuid: ${uuid}`);
        }
        return result;
      };
    },
  };

  return logger;
}

// 设置全局日志级别
export function setLevel(level: LogLevel): void {
  // eslint-disable-next-line no-prototype-builtins
  if (!LEVEL_WEIGHTS.hasOwnProperty(level)) {
    throw new Error(`Invalid log level: ${level}. Must be one of: ${Object.keys(LEVEL_WEIGHTS).join(', ')}`);
  }

  globalConfig.level = level;
}

// 启用特定命名空间
export function enableNamespace(namespace: string): void {
  if (globalConfig.enabledNamespaces === 'all') {
    globalConfig.enabledNamespaces = new Set();
  }
  globalConfig.enabledNamespaces.add(namespace);
}

// 启用多个命名空间
export function enableNamespaces(namespaces: string[]): void {
  namespaces.forEach(enableNamespace);
}

// 禁用特定命名空间
export function disableNamespace(namespace: string): void {
  if (globalConfig.enabledNamespaces !== 'all') {
    globalConfig.enabledNamespaces.delete(namespace);
  }
}

// 禁用多个命名空间
export function disableNamespaces(namespaces: string[]): void {
  namespaces.forEach(disableNamespace);
}

// 启用所有命名空间
export function enableAllNamespaces(): void {
  globalConfig.enabledNamespaces = 'all';
}

// 禁用所有命名空间
export function disableAllNamespaces(): void {
  globalConfig.enabledNamespaces = new Set();
}

// 获取当前配置
export function getConfig(): Readonly<LoggerConfig> {
  return { ...globalConfig };
}

// 重置配置为默认值
export function resetConfig(): void {
  globalConfig = { ...defaultConfig };
}

// 设置是否启用颜色
export function setEnableColors(enable: boolean): void {
  globalConfig.enableColors = enable;
}

// 设置是否显示时间戳
export function setTimestamp(enable: boolean): void {
  globalConfig.timestamp = enable;
}

// 默认导出 createLogger 函数
export default createLogger;
