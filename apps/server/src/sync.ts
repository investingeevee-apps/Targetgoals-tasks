import { Router } from 'express'
import type { Request, Response } from 'express'
import { eq, gt } from 'drizzle-orm'
import type {
  SyncChanges,
  SyncPullResponse,
  SyncPushRequest,
} from '@targetgoals/shared'
import {
  dailyCompletions,
  dailyTasks,
  db,
  lists,
  settings,
  tasks,
} from './db.js'

/** All changed rows (including tombstones) with `updatedAt` strictly after `since`. */
export async function getChangesSince(since: number): Promise<SyncChanges> {
  const [l, t, dt, dc, s] = await Promise.all([
    db.select().from(lists).where(gt(lists.updatedAt, since)),
    db.select().from(tasks).where(gt(tasks.updatedAt, since)),
    db.select().from(dailyTasks).where(gt(dailyTasks.updatedAt, since)),
    db.select().from(dailyCompletions).where(gt(dailyCompletions.updatedAt, since)),
    db.select().from(settings).where(gt(settings.updatedAt, since)),
  ])
  return {
    lists: l,
    tasks: t,
    dailyTasks: dt,
    dailyCompletions: dc,
    settings: s,
  } as unknown as SyncChanges
}

/** Non-deleted current state — convenient for debugging and simple clients. */
export async function getFullState(): Promise<SyncChanges> {
  const all = await getChangesSince(-1)
  return {
    lists: all.lists.filter((r) => !r.deleted),
    tasks: all.tasks.filter((r) => !r.deleted),
    dailyTasks: all.dailyTasks.filter((r) => !r.deleted),
    dailyCompletions: all.dailyCompletions.filter((r) => !r.deleted),
    settings: all.settings,
  }
}

/**
 * Upsert rows with last-write-wins: an incoming row is applied only if it is at
 * least as new (`updatedAt`) as what we already have. Returns rows applied.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertRows(table: any, idColumn: any, rows: any[] | undefined): Promise<number> {
  if (!rows?.length) return 0
  let applied = 0
  for (const row of rows) {
    const id = row.id ?? row.key
    const existing = await db
      .select({ updatedAt: table.updatedAt })
      .from(table)
      .where(eq(idColumn, id))
      .limit(1)
    if (existing.length && Number(existing[0].updatedAt) >= Number(row.updatedAt)) {
      continue
    }
    await db.insert(table).values(row).onConflictDoUpdate({ target: idColumn, set: row })
    applied++
  }
  return applied
}

/** Apply a bundle of client changes. Returns how many rows were written. */
export async function applyChanges(changes: Partial<SyncChanges>): Promise<number> {
  let applied = 0
  applied += await upsertRows(lists, lists.id, changes.lists)
  applied += await upsertRows(tasks, tasks.id, changes.tasks)
  applied += await upsertRows(dailyTasks, dailyTasks.id, changes.dailyTasks)
  applied += await upsertRows(dailyCompletions, dailyCompletions.id, changes.dailyCompletions)
  applied += await upsertRows(settings, settings.key, changes.settings)
  return applied
}

export const syncRouter = Router()

// Pull only: GET /api/sync?since=<ms>
syncRouter.get('/sync', async (req: Request, res: Response) => {
  const since = Number(req.query.since ?? 0) || 0
  const changes = await getChangesSince(since)
  const body: SyncPullResponse = { now: Date.now(), changes }
  res.json(body)
})

// Push + pull: POST /api/sync  { since, changes }
syncRouter.post('/sync', async (req: Request, res: Response) => {
  const payload = (req.body ?? {}) as SyncPushRequest
  const since = Number(payload.since ?? 0) || 0
  const applied = await applyChanges(payload.changes ?? {})
  const changes = await getChangesSince(since)
  const body: SyncPullResponse & { applied: number } = {
    now: Date.now(),
    applied,
    changes,
  }
  res.json(body)
})

// Full current state: GET /api/state
syncRouter.get('/state', async (_req: Request, res: Response) => {
  res.json(await getFullState())
})
