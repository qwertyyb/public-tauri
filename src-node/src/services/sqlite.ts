import * as path from 'path'
import Database from 'better-sqlite3'
import { getConfigDir } from '../utils/path'
import logger from '../utils/logger'

const dbPath = path.join(getConfigDir(), 'db.sqlite')
console.log('dbPath', dbPath)
const db = new Database(dbPath)

const createStorage = () => {
  const createStorageTable = () => {
    return db.exec(`CREATE TABLE IF NOT EXISTS storage(
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )`)
  }
  createStorageTable()
  return {
    setItem(key: string, value: string | number | boolean | any) {
      return db.prepare(`INSERT INTO storage(key, value, updatedAt) VALUES($key, $value, $updatedAt) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;`)
        .run({ key, value: JSON.stringify({ value }), updatedAt: Math.floor(Date.now() / 1000) })
    },
    getItem(key: string) {
      const result = db.prepare(`SELECT value FROM storage WHERE key = $key`).get({ key }) as { value: string } | undefined
      if (!result) return
      try {
        return JSON.parse(result.value).value
      } catch (err) {
        logger.error('parse storage failed: ', key, err)
      }
    },
    removeItem(key: string) {
      return db.prepare(`DELETE FROM storage WHERE key = $key`).run({ key })
    },
    allItems(keyPrefix?: string) {
      const results = db.prepare(`SELECT * FROM storage WHERE key LIKE $keyPrefix`).all({ keyPrefix: `${keyPrefix || ''}%`}) as { key: string, value: string }[]
      return results.reduce((acc, item) => {
        let value: any
        try {
          value = JSON.parse(item.value).value
        } catch (err) {
          logger.error('parse storage failed: ', item.key)
        }
        return {
          ...acc,
          [item.key]: value
        }
      }, {})
    },
    clear(keyPrefix?: string) {
      return db.prepare(`DELETE FROM storage WHERE key LIKE $keyPrefix`).run({ keyPrefix: `${keyPrefix || ''}%` })
    }
  }
}

export const storage = createStorage()


// export default db
