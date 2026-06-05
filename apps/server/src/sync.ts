import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
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
  goals,
  lists,
  scheduledCompletions,
  settings,
  tasks,
} from './db.js'

/** All changed rows (including tombstones) with `updatedAt` strictly after `since`. */
export async function getChangesSince(since: number): Promise<SyncChanges> {
  const [l, t, dt, dc, g, sc, s] = await Promise.all([
    db.select().from(lists).where(gt(lists.updatedAt, since)),
    db.select().from(tasks).where(gt(tasks.updatedAt, since)),
    db.select().from(dailyTasks).where(gt(dailyTasks.updatedAt, since)),
    db.select().from(dailyCompletions).where(gt(dailyCompletions.updatedAt, since)),
    db.select().from(goals).where(gt(goals.updatedAt, since)),
    db.select().from(scheduledCompletions).where(gt(scheduledCompletions.updatedAt, since)),
    db.select().from(settings).where(gt(settings.updatedAt, since)),
  ])
  return {
    lists: l,
    tasks: t,
    dailyTasks: dt,
    dailyCompletions: dc,
    goals: g,
    scheduledCompletions: sc,
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
    goals: all.goals.filter((r) => !r.deleted),
    scheduledCompletions: all.scheduledCompletions.filter((r) => !r.deleted),
    settings: all.settings,
  }
}

/** Reject obviously bad/poisoned rows before they touch the DB. */
const MAX_FUTURE_MS = 60_000 // tolerate up to 1 min of client clock skew
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isValidRow(row: any): boolean {
  if (!row || typeof row !== 'object') return false
  const id = row.id ?? row.key
  if (typeof id !== 'string' || id.length === 0 || id.length > 200) return false
  const u = Number(row.updatedAt)
  // finite, positive, and not absurdly in the future (blocks MAX_SAFE_INTEGER
  // poisoning that would win every future LWW conflict).
  if (!Number.isFinite(u) || u <= 0 || u > Date.now() + MAX_FUTURE_MS) return false
  return true
}

/**
 * Upsert rows with last-write-wins: an incoming row is applied only if it is
 * newer (`updatedAt`) than what we already have. Runs inside a transaction so
 * the read-then-write is atomic against concurrent pushes. Returns rows applied.
 */
async function upsertRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  idColumn: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[] | undefined,
): Promise<number> {
  if (!rows?.length) return 0
  let applied = 0
  for (const row of rows) {
    if (!isValidRow(row)) continue
    const id = row.id ?? row.key
    const existing = await dbx
      .select({ updatedAt: table.updatedAt })
      .from(table)
      .where(eq(idColumn, id))
      .limit(1)
    if (existing.length && Number(existing[0].updatedAt) >= Number(row.updatedAt)) {
      continue
    }
    await dbx.insert(table).values(row).onConflictDoUpdate({ target: idColumn, set: row })
    applied++
  }
  return applied
}

/** Apply a bundle of client changes atomically. Returns how many rows were written. */
export async function applyChanges(changes: Partial<SyncChanges>): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.transaction(async (tx: any) => {
    let applied = 0
    applied += await upsertRows(tx, lists, lists.id, changes.lists)
    applied += await upsertRows(tx, tasks, tasks.id, changes.tasks)
    applied += await upsertRows(tx, dailyTasks, dailyTasks.id, changes.dailyTasks)
    applied += await upsertRows(tx, dailyCompletions, dailyCompletions.id, changes.dailyCompletions)
    applied += await upsertRows(tx, goals, goals.id, changes.goals)
    applied += await upsertRows(tx, scheduledCompletions, scheduledCompletions.id, changes.scheduledCompletions)
    applied += await upsertRows(tx, settings, settings.key, changes.settings)
    return applied
  })
}

export const syncRouter = Router()

/** Wrap an async handler so rejected promises reach Express's error handler
 * instead of hanging the request (Express 4 does not forward them itself). */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next)
  }
}

// Pull only: GET /api/sync?since=<ms>
syncRouter.get(
  '/sync',
  asyncHandler(async (req: Request, res: Response) => {
    const since = Math.max(0, Number(req.query.since ?? 0) || 0)
    const now = Date.now()
    const changes = await getChangesSince(since)
    const body: SyncPullResponse = { now, changes }
    res.json(body)
  }),
)

// Push + pull: POST /api/sync  { since, changes }
syncRouter.post(
  '/sync',
  asyncHandler(async (req: Request, res: Response) => {
    const payload = (req.body ?? {}) as SyncPushRequest
    const since = Math.max(0, Number(payload.since ?? 0) || 0)
    // Stamp `now` BEFORE reading changes so the client's next `since` covers the
    // whole request window — otherwise rows another device writes between the
    // read and the timestamp would be skipped forever.
    const now = Date.now()
    const applied = await applyChanges(payload.changes ?? {})
    const changes = await getChangesSince(since)
    const body: SyncPullResponse & { applied: number } = { now, applied, changes }
    res.json(body)
  }),
)

// Full current state: GET /api/state
syncRouter.get(
  '/state',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(await getFullState())
  }),
)
