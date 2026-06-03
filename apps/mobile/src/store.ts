import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Celebration,
  DailyCompletionDTO,
  ID,
  Subtask,
  SyncChanges,
  TaskDTO,
} from '@targetgoals/shared'
import { computeStreaks, todayKey } from '@targetgoals/shared'
import { seedData, uid } from './lib/transform'

const nowIso = () => new Date().toISOString()
const nowMs = () => Date.now()

export type MobileScreen = 'tasks' | 'daily' | 'overview' | 'settings'

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
  currentListId: ID | null
  selectedTaskId: ID | null
  celebration: Celebration | null

  setScreen: (s: MobileScreen) => void
  dismissCelebration: () => void

  // lists
  selectList: (id: ID) => void
  addList: (name: string) => void
  renameList: (id: ID, name: string) => void
  deleteList: (id: ID) => void

  // tasks
  selectTask: (id: ID | null) => void
  addTask: (listId: ID, title: string) => void
  updateTask: (id: ID, patch: Partial<Pick<TaskDTO, 'title' | 'notes' | 'due' | 'starred'>>) => void
  toggleTask: (id: ID) => void
  toggleStar: (id: ID) => void
  deleteTask: (id: ID) => void
  clearCompleted: (listId: ID) => void
  moveTask: (id: ID, dir: 'up' | 'down') => void

  // subtasks
  addSubtask: (taskId: ID, title: string) => void
  toggleSubtask: (taskId: ID, subtaskId: ID) => void
  renameSubtask: (taskId: ID, subtaskId: ID, title: string) => void
  deleteSubtask: (taskId: ID, subtaskId: ID) => void

  addDailyTask: (title: string) => void
  renameDailyTask: (id: ID, title: string) => void
  deleteDailyTask: (id: ID) => void
  toggleDailyToday: (id: ID) => void

  collectDirty: () => { changes: Partial<SyncChanges>; keys: string[] }
  applyServerChanges: (changes: Partial<SyncChanges>) => void
  markSynced: (serverNow: number, keys: string[]) => void
  dropUnsyncedSeeds: () => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const initial = seedData()
      return {
        ...initial,
        screen: 'daily',
        currentListId: initial.lists.find((l) => !l.deleted)?.id ?? null,
        selectedTaskId: null,
        celebration: null,

        setScreen: (screen) => set({ screen, selectedTaskId: null }),
        dismissCelebration: () => set({ celebration: null }),

        // ---- lists ----
        selectList: (id) => set({ currentListId: id, selectedTaskId: null }),
        addList: (name) => {
          const trimmed = name.trim()
          if (!trimmed) return
          const id = uid()
          set((s) => ({
            lists: [...s.lists, { id, name: trimmed, createdAt: nowIso(), updatedAt: nowMs(), deleted: false }],
            dirty: { ...s.dirty, [`list:${id}`]: true },
            currentListId: id,
          }))
        },
        renameList: (id, name) => {
          const trimmed = name.trim()
          if (!trimmed) return
          set((s) => ({
            lists: s.lists.map((l) => (l.id === id ? { ...l, name: trimmed, updatedAt: nowMs() } : l)),
            dirty: { ...s.dirty, [`list:${id}`]: true },
          }))
        },
        deleteList: (id) =>
          set((s) => {
            const t = nowMs()
            const dirty = { ...s.dirty, [`list:${id}`]: true as const }
            const tasks = s.tasks.map((task) => {
              if (task.listId !== id || task.deleted) return task
              dirty[`task:${task.id}`] = true
              return { ...task, deleted: true, updatedAt: t }
            })
            const lists = s.lists.map((l) => (l.id === id ? { ...l, deleted: true, updatedAt: t } : l))
            const remaining = lists.filter((l) => !l.deleted)
            return {
              lists,
              tasks,
              dirty,
              currentListId: s.currentListId === id ? remaining[0]?.id ?? null : s.currentListId,
            }
          }),

        // ---- tasks ----
        selectTask: (id) => set({ selectedTaskId: id }),
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
                subtasks: [],
                order:
                  Math.min(
                    0,
                    ...s.tasks.filter((t) => t.listId === listId && !t.deleted).map((t) => t.order),
                  ) - 1,
              },
            ],
            dirty: { ...s.dirty, [`task:${id}`]: true },
          }))
        },
        updateTask: (id, patch) =>
          set((s) => ({
            tasks: s.tasks.map((task) => (task.id === id ? { ...task, ...patch, updatedAt: nowMs() } : task)),
            dirty: { ...s.dirty, [`task:${id}`]: true },
          })),
        toggleTask: (id) =>
          set((s) => ({
            tasks: s.tasks.map((task) =>
              task.id === id
                ? {
                    ...task,
                    completed: !task.completed,
                    completedAt: !task.completed ? nowIso() : null,
                    updatedAt: nowMs(),
                  }
                : task,
            ),
            dirty: { ...s.dirty, [`task:${id}`]: true },
          })),
        toggleStar: (id) =>
          set((s) => ({
            tasks: s.tasks.map((task) =>
              task.id === id ? { ...task, starred: !task.starred, updatedAt: nowMs() } : task,
            ),
            dirty: { ...s.dirty, [`task:${id}`]: true },
          })),
        deleteTask: (id) =>
          set((s) => ({
            tasks: s.tasks.map((task) => (task.id === id ? { ...task, deleted: true, updatedAt: nowMs() } : task)),
            dirty: { ...s.dirty, [`task:${id}`]: true },
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
        moveTask: (id, dir) =>
          set((s) => {
            const task = s.tasks.find((t) => t.id === id)
            if (!task) return {}
            const ordered = s.tasks
              .filter((t) => t.listId === task.listId && !t.deleted && !t.completed)
              .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
            const i = ordered.findIndex((t) => t.id === id)
            const j = dir === 'up' ? i - 1 : i + 1
            if (j < 0 || j >= ordered.length) return {}
            ;[ordered[i], ordered[j]] = [ordered[j], ordered[i]]
            const orderById = new Map(ordered.map((t, idx) => [t.id, idx]))
            const now = nowMs()
            const dirty = { ...s.dirty }
            const tasks = s.tasks.map((t) => {
              const next = orderById.get(t.id)
              if (next !== undefined && t.order !== next) {
                dirty[`task:${t.id}`] = true
                return { ...t, order: next, updatedAt: now }
              }
              return t
            })
            return { tasks, dirty }
          }),

        // ---- subtasks ----
        addSubtask: (taskId, title) => {
          const trimmed = title.trim()
          if (!trimmed) return
          const sub: Subtask = { id: uid(), title: trimmed, completed: false }
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId ? { ...t, subtasks: [...t.subtasks, sub], updatedAt: nowMs() } : t,
            ),
            dirty: { ...s.dirty, [`task:${taskId}`]: true },
          }))
        },
        toggleSubtask: (taskId, subtaskId) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    subtasks: t.subtasks.map((st) =>
                      st.id === subtaskId ? { ...st, completed: !st.completed } : st,
                    ),
                    updatedAt: nowMs(),
                  }
                : t,
            ),
            dirty: { ...s.dirty, [`task:${taskId}`]: true },
          })),
        renameSubtask: (taskId, subtaskId, title) => {
          const trimmed = title.trim()
          if (!trimmed) return
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    subtasks: t.subtasks.map((st) =>
                      st.id === subtaskId ? { ...st, title: trimmed } : st,
                    ),
                    updatedAt: nowMs(),
                  }
                : t,
            ),
            dirty: { ...s.dirty, [`task:${taskId}`]: true },
          }))
        },
        deleteSubtask: (taskId, subtaskId) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== subtaskId), updatedAt: nowMs() }
                : t,
            ),
            dirty: { ...s.dirty, [`task:${taskId}`]: true },
          })),

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
              const streak = computeStreaks(s.dailyTasks, dailyCompletions).currentStreak
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
        // Drop local example/seed rows (not dirty) on first connect so starter
        // habits don't duplicate the server's.
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
        currentListId: s.currentListId,
      }),
    },
  ),
)
