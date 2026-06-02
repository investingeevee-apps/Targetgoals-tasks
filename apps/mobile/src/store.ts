import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Celebration,
  DailyCompletionDTO,
  ID,
  SyncChanges,
} from '@targetgoals/shared'
import { computeStats, todayKey } from '@targetgoals/shared'
import { buildDailyLog, seedData, uid } from './lib/transform'

const nowIso = () => new Date().toISOString()
const nowMs = () => Date.now()

export type MobileScreen = 'daily' | 'overview' | 'settings'

function mergeById<T extends { id: string; updatedAt: number }>(local: T[], incoming: T[]): T[] {
  if (!incoming.length) return local
  const map = new Map(local.map((r) => [r.id, r]))
  for (const row of incoming) {
    const cur = map.get(row.id)
    if (!cur || row.updatedAt >= cur.updatedAt) map.set(row.id, row)
  }
  return Array.from(map.values())
}

interface State {
  lists: SyncChanges['lists']
  tasks: SyncChanges['tasks']
  dailyTasks: SyncChanges['dailyTasks']
  dailyCompletions: DailyCompletionDTO[]
  dirty: Record<string, true>
  lastSyncedAt: number

  screen: MobileScreen
  celebration: Celebration | null

  setScreen: (s: MobileScreen) => void
  dismissCelebration: () => void

  addDailyTask: (title: string) => void
  renameDailyTask: (id: ID, title: string) => void
  deleteDailyTask: (id: ID) => void
  toggleDailyToday: (id: ID) => void

  collectDirty: () => { changes: Partial<SyncChanges>; keys: string[] }
  applyServerChanges: (changes: Partial<SyncChanges>) => void
  markSynced: (serverNow: number, keys: string[]) => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const initial = seedData()
      return {
        ...initial,
        screen: 'daily',
        celebration: null,

        setScreen: (screen) => set({ screen }),
        dismissCelebration: () => set({ celebration: null }),

        addDailyTask: (title) => {
          const trimmed = title.trim()
          if (!trimmed) return
          const id = uid()
          set((s) => ({
            dailyTasks: [
              ...s.dailyTasks,
              { id, title: trimmed, archived: false, createdAt: nowIso(), updatedAt: nowMs(), deleted: false },
            ],
            dirty: { ...s.dirty, [`dailyTask:${id}`]: true },
          }))
        },
        renameDailyTask: (id, title) => {
          const trimmed = title.trim()
          if (!trimmed) return
          set((s) => ({
            dailyTasks: s.dailyTasks.map((d) =>
              d.id === id ? { ...d, title: trimmed, updatedAt: nowMs() } : d,
            ),
            dirty: { ...s.dirty, [`dailyTask:${id}`]: true },
          }))
        },
        deleteDailyTask: (id) =>
          set((s) => {
            const t = nowMs()
            const dirty = { ...s.dirty, [`dailyTask:${id}`]: true as const }
            const dailyCompletions = s.dailyCompletions.map((c) => {
              if (c.dailyTaskId !== id || c.deleted) return c
              dirty[`completion:${c.id}`] = true
              return { ...c, deleted: true, updatedAt: t }
            })
            const dailyTasks = s.dailyTasks.map((d) =>
              d.id === id ? { ...d, deleted: true, updatedAt: t } : d,
            )
            return { dailyTasks, dailyCompletions, dirty }
          }),
        toggleDailyToday: (dailyTaskId) =>
          set((s) => {
            const key = todayKey()
            const t = nowMs()
            const existing = s.dailyCompletions.find(
              (c) => c.dailyTaskId === dailyTaskId && c.dateKey === key,
            )
            const checkedOn = !existing || existing.deleted

            let dailyCompletions: DailyCompletionDTO[]
            let dirtyKey: string
            if (existing) {
              dirtyKey = `completion:${existing.id}`
              dailyCompletions = s.dailyCompletions.map((c) =>
                c.id === existing.id ? { ...c, deleted: !existing.deleted, updatedAt: t } : c,
              )
            } else {
              const id = uid()
              dirtyKey = `completion:${id}`
              dailyCompletions = [
                ...s.dailyCompletions,
                { id, dailyTaskId, dateKey: key, createdAt: nowIso(), updatedAt: t, deleted: false },
              ]
            }

            let celebration = s.celebration
            if (checkedOn) {
              const activeIds = new Set(
                s.dailyTasks.filter((d) => !d.deleted && !d.archived).map((d) => d.id),
              )
              const total = activeIds.size
              const doneActive = new Set(
                dailyCompletions
                  .filter((c) => !c.deleted && c.dateKey === key && activeIds.has(c.dailyTaskId))
                  .map((c) => c.dailyTaskId),
              ).size
              const streak = computeStats(buildDailyLog(dailyCompletions)).currentStreak
              if (total > 0 && doneActive === total) celebration = { kind: 'allDone', streak, total }
              else if (doneActive === 1) celebration = { kind: 'logged', streak, total }
            }

            return { dailyCompletions, dirty: { ...s.dirty, [dirtyKey]: true }, celebration }
          }),

        collectDirty: () => {
          const s = get()
          const changes: Partial<SyncChanges> = {
            lists: [],
            tasks: [],
            dailyTasks: [],
            dailyCompletions: [],
          }
          const keys = Object.keys(s.dirty)
          for (const key of keys) {
            const sep = key.indexOf(':')
            const kind = key.slice(0, sep)
            const id = key.slice(sep + 1)
            if (kind === 'list') {
              const r = s.lists.find((x) => x.id === id)
              if (r) changes.lists!.push(r)
            } else if (kind === 'task') {
              const r = s.tasks.find((x) => x.id === id)
              if (r) changes.tasks!.push(r)
            } else if (kind === 'dailyTask') {
              const r = s.dailyTasks.find((x) => x.id === id)
              if (r) changes.dailyTasks!.push(r)
            } else if (kind === 'completion') {
              const r = s.dailyCompletions.find((x) => x.id === id)
              if (r) changes.dailyCompletions!.push(r)
            }
          }
          return { changes, keys }
        },
        applyServerChanges: (changes) =>
          set((s) => ({
            lists: mergeById(s.lists, changes.lists ?? []),
            tasks: mergeById(s.tasks, changes.tasks ?? []),
            dailyTasks: mergeById(s.dailyTasks, changes.dailyTasks ?? []),
            dailyCompletions: mergeById(s.dailyCompletions, changes.dailyCompletions ?? []),
          })),
        markSynced: (serverNow, keys) =>
          set((s) => {
            const dirty = { ...s.dirty }
            for (const k of keys) delete dirty[k]
            return { dirty, lastSyncedAt: serverNow }
          }),
      }
    },
    {
      name: 'targetgoals-mobile-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        lists: s.lists,
        tasks: s.tasks,
        dailyTasks: s.dailyTasks,
        dailyCompletions: s.dailyCompletions,
        dirty: s.dirty,
        lastSyncedAt: s.lastSyncedAt,
        screen: s.screen,
      }),
    },
  ),
)
