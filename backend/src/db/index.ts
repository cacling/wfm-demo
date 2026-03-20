/**
 * db/index.ts — 数据库连接
 *
 * 使用 Bun 内置的 SQLite 驱动 + Drizzle ORM
 * WAL 模式提升并发读写性能
 */

import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema'

import { mkdirSync } from 'fs'

// 确保 data 目录存在
mkdirSync(new URL('../../data', import.meta.url), { recursive: true })

const sqlite = new Database(new URL('../../data/wfm.db', import.meta.url).pathname)
sqlite.exec('PRAGMA journal_mode = WAL')
sqlite.exec('PRAGMA foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
