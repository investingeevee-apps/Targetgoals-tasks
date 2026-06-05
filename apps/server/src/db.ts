import { pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { GoalProgressEntry, Recurrence, Subtask } from '@targetgoals/shared'
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
  subtasks: text('subtasks', { mode: 'json' }).$type<Subtask[]>().notNull().default([]),
  order: integer('sort_order').notNull().default(0),
  goalId: text('goal_id'),
  scheduledDate: text('scheduled_date'),
  recurrence: text('recurrence', { mode: 'json' }).$type<Recurrence | null>(),
})

export const dailyTasks = sqliteTable('daily_tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  order: integer('sort_order').notNull().default(0),
  goalId: text('goal_id'),
})

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  why: text('why').notNull().default(''),
  targetDate: text('target_date'),
  progressMode: text('progress_mode').notNull().default('milestones'),
  targetValue: real('target_value'),
  unit: text('unit'),
  currentValue: real('current_value'),
  progressLog: text('progress_log', { mode: 'json' }).$type<GoalProgressEntry[]>().notNull().default([]),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  order: integer('sort_order').notNull().default(0),
})

export const scheduledCompletions = sqliteTable('scheduled_completions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  dateKey: text('date_key').notNull(),
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
  schema: { lists, tasks, dailyTasks, dailyCompletions, goals, scheduledCompletions, settings },
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
  deleted INTEGER NOT NULL DEFAULT 0,
  subtasks TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  goal_id TEXT,
  scheduled_date TEXT,
  recurrence TEXT
);
CREATE TABLE IF NOT EXISTS daily_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  goal_id TEXT
);
CREATE TABLE IF NOT EXISTS daily_completions (
  id TEXT PRIMARY KEY,
  daily_task_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  why TEXT NOT NULL DEFAULT '',
  target_date TEXT,
  progress_mode TEXT NOT NULL DEFAULT 'milestones',
  target_value REAL,
  unit TEXT,
  current_value REAL,
  progress_log TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS scheduled_completions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_goals_updated ON goals(updated_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_completions_updated ON scheduled_completions(updated_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_completions_task ON scheduled_completions(task_id);
`

// Tables we allow ALTER on — guards the string-interpolated DDL below.
const MIGRATABLE_TABLES = new Set([
  'tasks', 'daily_tasks', 'daily_completions', 'lists', 'settings', 'goals', 'scheduled_completions',
])

/** Add a column if it doesn't exist yet (idempotent migration). */
async function addColumnIfMissing(table: string, columnDef: string): Promise<void> {
  if (!MIGRATABLE_TABLES.has(table)) {
    throw new Error(`addColumnIfMissing: refusing to ALTER unknown table '${table}'`)
  }
  try {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // Only "column already exists" is expected/ignorable; rethrow anything else
    // (disk full, corrupt DB, typo) so it isn't silently swallowed.
    if (!/duplicate column name|already exists/i.test(msg)) throw err
  }
}

/** Create tables/indexes if they don't exist yet, and migrate older DBs. */
export async function initDb(): Promise<void> {
  await client.executeMultiple(DDL)
  // migrations for databases created before these columns existed
  await addColumnIfMissing('tasks', "subtasks TEXT NOT NULL DEFAULT '[]'")
  await addColumnIfMissing('tasks', 'sort_order INTEGER NOT NULL DEFAULT 0')
  await addColumnIfMissing('daily_tasks', 'sort_order INTEGER NOT NULL DEFAULT 0')
  // Goals + scheduled-tasks feature
  await addColumnIfMissing('tasks', 'goal_id TEXT')
  await addColumnIfMissing('tasks', 'scheduled_date TEXT')
  await addColumnIfMissing('tasks', 'recurrence TEXT')
  await addColumnIfMissing('daily_tasks', 'goal_id TEXT')
}
