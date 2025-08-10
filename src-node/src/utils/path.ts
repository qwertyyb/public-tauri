import { homedir } from 'node:os'
import { join } from 'node:path'
import { ensureDirSync } from 'fs-extra'
import logger from './logger'

const bundleIdentifier = 'com.qwertyyb.public'

export const getConfigDir = () => {
  const configDir = join(homedir(), `Application Support/${bundleIdentifier}`)
  ensureDirSync(configDir)
  return configDir
}
