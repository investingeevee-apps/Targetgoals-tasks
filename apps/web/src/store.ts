import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Celebration,
  DailyCompletionDTO,
  DailyTaskDTO,
  ID,
  ListDTO,
  Screen,
  SyncChanges,
  TaskDTO,
} from '@targetgoals/shared'
import { computeStreaks, todayKey } from '@targetgoals/shared'
import {
  STORE_KEY,
  convertLegacy,
  deriveInitialData,
  uid,
} from './lib/transform'

const nowIso = () => new Date().toISOString()
const nowMs = () => Date.now()

/** Generic last-write-wins merge of incoming rows into a local array (by id). */
function mergeById<T extends { id: string; updatedAt: number }>(
  local: T[],
  incoming: T[],
): T[] {
  if (!incoming.length) return local
  const map = new Map(local.map((r) => [r.id, r]))
  for (const row of incoming) {
    const cur = map.get(row.id)
    if (!cur || row.updatedAt >= cur.updatedAt) map.set(row.id, row)
  }
  return Array.from(map.values())
}

interface State {
  // data (includes soft-deleted tombstones; selectors filter them out)
  lists: ListDTO[]
  tasks: TaskDTO[]
  dailyTasks: DailyTaskDTO[]
  dailyCompletions: DailyCompletionDTO[]

  // sync bookkeeping
  dirty: Record<string, true>
  lastSyncedAt: number

  // navigation
  screen: Screen
  currentListId: ID | null
  selectedTaskId: ID | null

  // transient UI (not persisted)
  celebration: Celebration | null
  dismissCelebration: () => void

  // ---- navigation ----
  setScreen: (screen: Screen) => void
  selectList: (id: ID) => void
  selectTask: (id: ID | null) => void

  // ---- lists ----
  addList: (name: string) => void
  renameList: (id: ID, name: string) => void
  deleteList: (id: ID) => void

  // ---- tasks ----
  addTask: (listId: ID, title: string) => void
  updateTask: (id: ID, patch: Partial<Pick<TaskDTO, 'title' | 'notes' | 'due' | 'starred'>>) => void
  toggleTask: (id: ID) => void
  toggleStar: (id: ID) => void
  deleteTask: (id: ID) => void
  clearCompleted: (listId: ID) => void

  // ---- daily tasks ----
  addDailyTask: (title: string) => void
  renameDailyTask: (id: ID, title: string) => void
  deleteDailyTask: (id: ID) => void
  toggleDailyToday: (id: ID) => void

  // ---- sync integration (called by the sync engine) ----
  collectDirty: () => { changes: Partial<SyncChanges>; keys: string[] }
  applyServerChanges: (changes: Partial<SyncChanges>) => void
  markSynced: (serverNow: number, keys: string[]) => void
  dropUnsyncedSeeds: () => void
  importLegacy: () => number
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const initial = deriveInitialData()

      /** Mark an entity dirty so the sync engine pushes it. */
      const dirtyWith = (s: State, kind: string, id: string): Record<string, true> => ({
        ...s.dirty,
        [`${kind}:${id}`]: true,
      })

      return {
        ...initial,
        screen: 'tasks',
        currentListId: initial.lists.find((l) => !l.deleted)?.id ?? null,
        selectedTaskId: null,
        celebration: null,

        dismissCelebration: () => set({ celebration: null }),

        // ---- navigation ----
        setScreen: (screen) => set({ screen, selectedTaskId: null }),
        selectList: (id) =>
          set({ screen: 'tasks', currentListId: id, selectedTaskId: null }),
        selectTask: (id) => set({ selectedTaskId: id }),

        // ---- lists ----
        addList: (name) => {
          const trimmed = name.trim()
          if (!trimmed) return
          const id = uid()
          set((s) => ({
            lists: [
              ...s.lists,
              { id, name: trimmed, createdAt: nowIso(), updatedAt: nowMs(), deleted: false },
            ],
            dirty: dirtyWith(s, 'list', id),
            screen: 'tasks',
            currentListId: id,
          }))
        },
        renameList: (id, name) => {
          const trimmed = name.trim()
          if (!trimmed) return
          set((s) => ({
            lists: s.lists.map((l) =>
              l.id === id ? { ...l, name: trimmed, updatedAt: nowMs() } : l,
            ),
            dirty: dirtyWith(s, 'list', id),
          }))
        },
        deleteList: (id) =>
          set((s) => {
            const t = nowMs()
            const dirty = { ...s.dirty, [`list:${id}`]: true as const }
            // tombstone the list and its tasks
            const tasks = s.tasks.map((task) => {
              if (task.listId !== id || task.deleted) return task
              dirty[`task:${task.id}`] = true
              return { ...task, deleted: true, updatedAt: t }
            })
            const lists = s.lists.map((l) =>
              l.id === id ? { ...l, deleted: true, updatedAt: t } : l,
            )
            const remaining = lists.filter((l) => !l.deleted)
            return {
              lists,
              tasks,
              dirty,
              currentListId:
                s.currentListId === id ? remaining[0]?.id ?? null : s.currentListId,
            }
          }),

        // ---- tasks ----
        addTask: (listId, title) => {
          const trimmed = title.trim()
          if (!trimmed) return
          const id = uid()
          set((s) => ({
            tasks: [
              ...s.tasks,
              {
                id,
                listId,
                title: trimmed,
                notes: '',
                due: null,
                starred: false,
                completed: false,
                completedAt: null,
                createdAt: nowIso(),
                updatedAt: nowMs(),
                deleted: false,
              },
            ],
            dirty: dirtyWith(s, 'task', id),
          }))
        },
        updateTask: (id, patch) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id ? { ...t, ...patch, updatedAt: nowMs() } : t,
            ),
            dirty: dirtyWith(s, 'task', id),
          })),
        toggleTask: (id) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    completed: !t.completed,
                    completedAt: !t.completed ? nowIso() : null,
                    updatedAt: nowMs(),
                  }
                : t,
            ),
            dirty: dirtyWith(s, 'task', id),
          })),
        toggleStar: (id) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id ? { ...t, starred: !t.starred, updatedAt: nowMs() } : t,
            ),
            dirty: dirtyWith(s, 'task', id),
          })),
        deleteTask: (id) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id ? { ...t, deleted: true, updatedAt: nowMs() } : t,
            ),
            dirty: dirtyWith(s, 'task', id),
            selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
          })),
        clearCompleted: (listId) =>
          set((s) => {
            const t = nowMs()
            const dirty = { ...s.dirty }
            const tasks = s.tasks.map((task) => {
              if (task.listId !== listId || !task.completed || task.deleted) return task
              dirty[`task:${task.id}`] = true
              return { ...task, deleted: true, updatedAt: t }
            })
            return { tasks, dirty }
          }),

        // ---- daily tasks ----
        addDailyTask: (title) => {
          const trimmed = title.trim()
          if (!trimmed) return
          const id = uid()
          set((s) => ({
            dailyTasks: [
              ...s.dailyTasks,
              { id, title: trimmed, archived: false, createdAt: nowIso(), updatedAt: nowMs(), deleted: false },
            ],
            dirty: dirtyWith(s, 'dailyTask', id),
          }))
        },
        renameDailyTask: (id, title) => {
          const trimmed = title.trim()
          if (!trimmed) return
          set((s) => ({
            dailyTasks: s.dailyTasks.map((d) =>
              d.id === id ? { ...d, title: trimmed, updatedAt: nowMs() } : d,
            ),
            dirty: dirtyWith(s, 'dailyTask', id),
          }))
        },
        deleteDailyTask: (id) =>
          set((s) => {
            const t = nowMs()
            const dirty = { ...s.dirty, [`dailyTask:${id}`]: true as const }
            // tombstone the habit and its completion history
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

            let dailyCompletions: DailyCompletionDTO[]
            let dirtyKey: string
            // checkedOn = we are turning the completion ON
            const checkedOn = !existing || existing.deleted

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
              const streak = computeStreaks(s.dailyTasks, dailyCompletions).currentStreak
              if (total > 0 && doneActive === total) {
                celebration = { kind: 'allDone', streak, total }
              } else if (doneActive === 1) {
                celebration = { kind: 'logged', streak, total }
              }
            }

            return { dailyCompletions, dirty: { ...s.dirty, [dirtyKey]: true }, celebration }
          }),

        // ---- sync integration ----
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
        // Drop local example/seed rows (anything never edited, i.e. not dirty) when
        // first connecting to a server, so starter habits don't become duplicates.
        dropUnsyncedSeeds: () =>
          set((s) => {
            const has = (kind: string, id: string) => Boolean(s.dirty[`${kind}:${id}`])
            // Habits the user has actually completed = real activity, never drop them.
            const usedHabits = new Set(
              s.dailyCompletions.filter((c) => !c.deleted).map((c) => c.dailyTaskId),
            )
            const lists = s.lists.filter((r) => has('list', r.id))
            const tasks = s.tasks.filter((r) => has('task', r.id))
            const dailyTasks = s.dailyTasks.filter(
              (d) => has('dailyTask', d.id) || usedHabits.has(d.id),
            )
            const keptDaily = new Set(dailyTasks.map((d) => d.id))
            const dailyCompletions = s.dailyCompletions.filter((c) => keptDaily.has(c.dailyTaskId))
            // Mark kept rows dirty so any local-only history uploads to the server.
            const dirty = { ...s.dirty }
            for (const d of dailyTasks) dirty[`dailyTask:${d.id}`] = true
            for (const c of dailyCompletions) dirty[`completion:${c.id}`] = true
            return { lists, tasks, dailyTasks, dailyCompletions, dirty }
          }),
        importLegacy: () => {
          const data = convertLegacy()
          if (!data) return 0
          set((s) => ({
            lists: mergeById(s.lists, data.lists),
            tasks: mergeById(s.tasks, data.tasks),
            dailyTasks: mergeById(s.dailyTasks, data.dailyTasks),
            dailyCompletions: mergeById(s.dailyCompletions, data.dailyCompletions),
            dirty: { ...s.dirty, ...data.dirty },
            currentListId:
              s.currentListId ?? data.lists.find((l) => !l.deleted)?.id ?? null,
          }))
          return (
            data.lists.length +
            data.tasks.length +
            data.dailyTasks.length +
            data.dailyCompletions.length
          )
        },
      }
    },
    {
      name: STORE_KEY,
      version: 2,
      partialize: (s) => ({
        lists: s.lists,
        tasks: s.tasks,
        dailyTasks: s.dailyTasks,
        dailyCompletions: s.dailyCompletions,
        dirty: s.dirty,
        lastSyncedAt: s.lastSyncedAt,
        screen: s.screen,
        currentListId: s.currentListId,
      }),
    },
  ),
)
