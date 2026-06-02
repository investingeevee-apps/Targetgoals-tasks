import { pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { DB_PATH } from './config.js'

// ---- schema (column names are snake_case; field names camelCase) ----

export const lists = sqliteTable('lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  listId: text('list_id').notNull(),
  title: text('title').notNull(),
  notes: text('notes').notNull().default(''),
  due: text('due'),
  starred: integer('starred', { mode: 'boolean' }).notNull().default(false),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
})

export const dailyTasks = sqliteTable('daily_tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
})

export const dailyCompletions = sqliteTable('daily_completions', {
  id: text('id').primaryKey(),
  dailyTaskId: text('daily_task_id').notNull(),
  dateKey: text('date_key').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// ---- connection ----

export const client = createClient({ url: pathToFileURL(DB_PATH).href })
export const db = drizzle(client, {
  schema: { lists, tasks, dailyTasks, dailyCompletions, settings },
})

const DDL = `
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  due TEXT,
  starred INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS daily_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS daily_completions (
  id TEXT PRIMARY KEY,
  daily_task_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lists_updated ON lists(updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_updated ON daily_tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_daily_completions_updated ON daily_completions(updated_at);
CREATE INDEX IF NOT EXISTS idx_daily_completions_date ON daily_completions(date_key);
`

/** Create tables/indexes if they don't exist yet (idempotent). */
export async function initDb(): Promise<void> {
  await client.executeMultiple(DDL)
}
