import { resourceDir } from '@tauri-apps/api/path';
import { Child, Command } from 'tauri-plugin-shellx-api';
import path from 'path-browserify';

const SERVER_PORT = 2345;

const logger = {
  info: (...args: any[]) => console.info('%c NodeJS Server', 'color:red;font-weight:bold;background:yellow;', ...args),
  warn: (...args: any[]) => console.warn('%c NodeJS Server', 'color:red;font-weight:bold;background:yellow;', ...args),
  error: (...args: any[]) => console.error('%c NodeJS Server', 'color:red;font-weight:bold;background:yellow;', ...args),
};

const createCommand = async () => {
  console.log('resourceDir', await resourceDir());
  let command: Command<string>;

  if (import.meta.env.DEV) {
    command = Command.create('pnpm', ['dev:node']);
    command.stdout.on('data', (data) => {
      logger.info('stdout', data.toString());
    });
    command.on('close', () => {
      logger.warn('closed');
    });
    command.on('error', (error) => {
      logger.error('error', error);
    });
    command.stderr.on('data', (data) => {
      logger.error('stderr', data.toString());
    });
  } else {
    const resDir = await resourceDir();
    const entryPath = path.join(resDir, '_up_/src-node/dist/index.cjs');
    // shellx 以 unlocked 模式初始化（init(true)），spawn 时直接 Command::new(program) 执行原始
    // program 字符串，完全跳过 sidecar / scope 解析。因此 'binaries/node-v24.11.1' 会被当成相对
    // 路径而 ENOENT。这里必须传 node 可执行文件的绝对路径：Resources 同级的 MacOS 目录。
    const nodePath = path.join(resDir, '../MacOS/node-v24.11.1');
    logger.info('entryPath', entryPath, 'nodePath', nodePath);
    command = Command.create(nodePath, [entryPath], {
      env: { LSUIElement: '1' },
    });
  }

  return command;
};

let process: Child;

export const isRunning = async () => {
  const timeoutController = new AbortController();
  setTimeout(() => {
    timeoutController.abort();
  }, 1000);
  try {
    const r = await fetch(`http://localhost:${SERVER_PORT}/health`, {
      signal: timeoutController.signal,
    });
    return r.status === 200;
  } catch (err) {
    console.error('isRunning error', err);
    return false;
  }
};

export const start = async () => {
  if (await isRunning()) {
    console.log('NodeJS Server already running, skip spawn');
    return;
  }
  console.log('start NodeJS Server');
  const command = await createCommand();
  return new Promise<void>((resolve, reject) => {
    const handler = (data: string) => {
      if (data.trim() === 'public server is ready') {
        resolve();
        command.stdout.off('data', handler);
      }
    };
    command.stdout.on('data', handler);
    command.once('error', () => reject());
    command.on('close', () => {
      console.log('NodeJS Server closed');
      location.reload();
    });
    command.spawn().then((result) => {
      console.log('NodeJS Server started');
      process = result;
    })
      .catch((err) => {
        console.error('NodeJS Server error:', err);
        reject(err);
      });
  });
};

export const stop = () => process?.kill();

window.addEventListener('beforeunload', () => {
  stop();
});
