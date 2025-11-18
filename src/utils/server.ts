import { resourceDir } from "@tauri-apps/api/path";
import { Child, Command } from "@tauri-apps/plugin-shell";
import path from "path-browserify";

const command = Command.sidecar('binaries/node-v24.11.1', ['$RESOURCE/_up_/src-node/dist/index.cjs'])

const logger = {
  info: (...args: any[]) => {
    return console.info("%c NodeJS Server", "color:red;font-weight:bold;background:yellow;", ...args)
  },
  warn: (...args: any[]) => {
    return console.warn("%c NodeJS Server", "color:red;font-weight:bold;background:yellow;", ...args)
  },
  error: (...args: any[]) => {
    return console.error("%c NodeJS Server", "color:red;font-weight:bold;background:yellow;", ...args) 
  }
}

command.stdout.on('data', (data) => {
  logger.info('stdout', data.toString())
})
command.on('close', () => {
  logger.warn('closed')
})
command.on('error', (error) => {
  logger.error('error', error)
})
command.stderr.on('data', (data) => {
  logger.error('stderr', data.toString())
})

const createCommand = async () => {
  console.log('resourceDir', await resourceDir())
  const entryPath = import.meta.env.DEV ? '../src-node/dist/index.cjs' : path.join(await resourceDir(), '_up_/src-node/dist/index.cjs')
  const command = Command.sidecar('binaries/node-v24.11.1', [entryPath], {
    env: { LSUIElement: '1' }
  })

  if (import.meta.env.DEV) {
    command.stdout.on('data', (data) => {
      logger.info('stdout', data.toString())
    })
    command.on('close', () => {
      logger.warn('closed')
    })
    command.on('error', (error) => {
      logger.error('error', error)
    })
    command.stderr.on('data', (data) => {
      logger.error('stderr', data.toString())
    })
  }

  return command;
}

let process: Child

export const start = async () => {
  const command = await createCommand()
  return new Promise<void>((resolve, reject) => {
    const handler = (data: string) => {
      if (data.trim() === 'public server is ready') {
        resolve()
        command.stdout.off('data', handler)
      }
    }
    command.stdout.on('data', handler)
    command.once('error', () => reject())
    command.spawn().then(result => {
      process = result
    })
  })
}

export const stop = () => {
  return process?.kill();
}

window.addEventListener('unload', () => {
  stop()
})
