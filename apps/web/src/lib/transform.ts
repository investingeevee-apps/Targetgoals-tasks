import type {
  DailyCompletionDTO,
  DailyLog,
  DailyTaskDTO,
  ListDTO,
  TaskDTO,
} from '@targetgoals/shared'

export const uid = (): string => crypto.randomUUID()
const nowIso = () => new Date().toISOString()
const nowMs = () => Date.now()

/** Snapshot of all syncable data plus the set of rows that still need pushing. */
export interface StoreData {
  lists: ListDTO[]
  tasks: TaskDTO[]
  dailyTasks: DailyTaskDTO[]
  dailyCompletions: DailyCompletionDTO[]
  dirty: Record<string, true>
  lastSyncedAt: number
}

export function emptyData(): StoreData {
  return {
    lists: [],
    tasks: [],
    dailyTasks: [],
    dailyCompletions: [],
    dirty: {},
    lastSyncedAt: 0,
  }
}

/** Rebuild the legacy `dailyLog` map (dateKey -> dailyTaskIds) from completions. */
export function buildDailyLog(completions: DailyCompletionDTO[]): DailyLog {
  const log: DailyLog = {}
  for (const c of completions) {
    if (c.deleted) continue
    ;(log[c.dateKey] ??= []).push(c.dailyTaskId)
  }
  return log
}

export const LEGACY_KEY = 'tally-store-v1'
export const STORE_KEY = 'targetgoals-store-v2'

/** True if there's data from the pre-sync (localStorage-only) version to import. */
export function hasLegacyData(): boolean {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const s = parsed?.state
    return Boolean(
      s &&
        ((s.tasks?.length ?? 0) > 0 ||
          (s.dailyTasks?.length ?? 0) > 0 ||
          (s.lists?.length ?? 0) > 0),
    )
  } catch {
    return false
  }
}

interface LegacyState {
  lists?: { id: string; name: string; createdAt: string }[]
  tasks?: {
    id: string
    listId: string
    title: string
    notes?: string
    due?: string
    starred?: boolean
    completed?: boolean
    completedAt?: string
    createdAt: string
  }[]
  dailyTasks?: { id: string; title: string; createdAt: string; archived?: boolean }[]
  dailyLog?: Record<string, string[]>
}

/**
 * Convert the legacy localStorage blob into sync-native DTOs. Every imported row
 * is stamped `updatedAt = now` and marked dirty so it uploads on first sync.
 * Returns null if there's nothing to import.
 */
export function convertLegacy(): StoreData | null {
  let s: LegacyState | undefined
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    s = JSON.parse(raw)?.state as LegacyState
  } catch {
    return null
  }
  if (!s) return null

  const t = nowMs()
  const dirty: Record<string, true> = {}

  const lists: ListDTO[] = (s.lists ?? []).map((l) => {
    dirty[`list:${l.id}`] = true
    return { id: l.id, name: l.name, createdAt: l.createdAt, updatedAt: t, deleted: false }
  })

  const tasks: TaskDTO[] = (s.tasks ?? []).map((task, i) => {
    dirty[`task:${task.id}`] = true
    return {
      id: task.id,
      listId: task.listId,
      title: task.title,
      notes: task.notes ?? '',
      due: task.due ?? null,
      starred: Boolean(task.starred),
      completed: Boolean(task.completed),
      completedAt: task.completedAt ?? null,
      createdAt: task.createdAt,
      updatedAt: t,
      deleted: false,
      subtasks: [],
      order: i,
    }
  })

  const dailyTasks: DailyTaskDTO[] = (s.dailyTasks ?? []).map((d, i) => {
    dirty[`dailyTask:${d.id}`] = true
    return {
      id: d.id,
      title: d.title,
      archived: Boolean(d.archived),
      createdAt: d.createdAt,
      updatedAt: t,
      deleted: false,
      order: i,
    }
  })

  const dailyCompletions: DailyCompletionDTO[] = []
  for (const [dateKey, ids] of Object.entries(s.dailyLog ?? {})) {
    for (const dailyTaskId of ids) {
      const id = uid()
      dirty[`completion:${id}`] = true
      dailyCompletions.push({
        id,
        dailyTaskId,
        dateKey,
        createdAt: nowIso(),
        updatedAt: t,
        deleted: false,
      })
    }
  }

  if (!lists.length && !tasks.length && !dailyTasks.length) return null
  return { lists, tasks, dailyTasks, dailyCompletions, dirty, lastSyncedAt: 0 }
}

/**
 * Friendly starter data for a brand-new user (no legacy, no server data yet).
 * These are LOCAL EXAMPLES only — `dirty` is left empty so they never sync to a
 * server, and the sync engine discards them the first time the device connects
 * (see `dropUnsyncedSeeds`). This prevents every device's starter habits from
 * piling up as duplicates on a shared server.
 */
export function seedData(): StoreData {
  const t = nowMs()
  const listId = uid()
  const dirty: Record<string, true> = {}

  const tasks: TaskDTO[] = [
    {
      id: uid(),
      listId,
      title: 'Welcome to TargetGoals Tasks 👋  Click me to add notes & a due date',
      notes: '',
      due: null,
      starred: true,
      completed: false,
      completedAt: null,
      createdAt: nowIso(),
      updatedAt: t,
      deleted: false,
      subtasks: [],
      order: 0,
    },
    {
      id: uid(),
      listId,
      title: 'Try the Daily tab — habits that reset every day',
      notes: '',
      due: null,
      starred: false,
      completed: false,
      completedAt: null,
      createdAt: nowIso(),
      updatedAt: t,
      deleted: false,
      subtasks: [],
      order: 1,
    },
  ]

  const dailyTasks: DailyTaskDTO[] = [
    { id: uid(), title: 'Drink water', archived: false, createdAt: nowIso(), updatedAt: t, deleted: false, order: 0 },
    { id: uid(), title: 'Exercise', archived: false, createdAt: nowIso(), updatedAt: t, deleted: false, order: 1 },
    { id: uid(), title: 'Read 10 pages', archived: false, createdAt: nowIso(), updatedAt: t, deleted: false, order: 2 },
  ]

  return {
    lists: [{ id: listId, name: 'My Tasks', createdAt: nowIso(), updatedAt: t, deleted: false }],
    tasks,
    dailyTasks,
    dailyCompletions: [],
    dirty,
    lastSyncedAt: 0,
  }
}

/** Choose the store's initial data: rehydrated (empty placeholder), legacy, or seed. */
export function deriveInitialData(): StoreData {
  if (typeof localStorage === 'undefined') return seedData()
  if (localStorage.getItem(STORE_KEY)) return emptyData() // persist will rehydrate
  return convertLegacy() ?? seedData()
}
