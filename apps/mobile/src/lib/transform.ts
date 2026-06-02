import type {
  DailyCompletionDTO,
  DailyLog,
  DailyTaskDTO,
  ListDTO,
  TaskDTO,
} from '@targetgoals/shared'

export const uid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

const nowIso = () => new Date().toISOString()
const nowMs = () => Date.now()

export interface StoreData {
  lists: ListDTO[]
  tasks: TaskDTO[]
  dailyTasks: DailyTaskDTO[]
  dailyCompletions: DailyCompletionDTO[]
  dirty: Record<string, true>
  lastSyncedAt: number
}

export function emptyData(): StoreData {
  return { lists: [], tasks: [], dailyTasks: [], dailyCompletions: [], dirty: {}, lastSyncedAt: 0 }
}

/** Rebuild the dateKey -> dailyTaskIds map from completions (for stats/heatmap). */
export function buildDailyLog(completions: DailyCompletionDTO[]): DailyLog {
  const log: DailyLog = {}
  for (const c of completions) {
    if (c.deleted) continue
    ;(log[c.dateKey] ??= []).push(c.dailyTaskId)
  }
  return log
}

/**
 * Friendly starter habits for a brand-new install (before first sync).
 * LOCAL EXAMPLES only — `dirty` stays empty so they never push, and the sync
 * engine drops them on first connect (see `dropUnsyncedSeeds`) so each device's
 * starter habits don't pile up as duplicates on a shared server.
 */
export function seedData(): StoreData {
  const t = nowMs()
  const dailyTasks: DailyTaskDTO[] = [
    { id: uid(), title: 'Drink water', archived: false, createdAt: nowIso(), updatedAt: t, deleted: false },
    { id: uid(), title: 'Exercise', archived: false, createdAt: nowIso(), updatedAt: t, deleted: false },
    { id: uid(), title: 'Read 10 pages', archived: false, createdAt: nowIso(), updatedAt: t, deleted: false },
  ]
  return { lists: [], tasks: [], dailyTasks, dailyCompletions: [], dirty: {}, lastSyncedAt: 0 }
}
