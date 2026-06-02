import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Celebration,
  DailyLog,
  DailyTask,
  ID,
  Screen,
  Task,
  TaskList,
} from './types'
import { todayKey } from './lib/dates'
import { computeStats } from './lib/stats'

function uid(): string {
  // crypto.randomUUID is available in all modern browsers.
  return crypto.randomUUID()
}

interface State {
  // data
  lists: TaskList[]
  tasks: Task[]
  dailyTasks: DailyTask[]
  dailyLog: DailyLog

  // navigation
  screen: Screen
  currentListId: ID | null
  selectedTaskId: ID | null

  // transient UI (not persisted)
  celebration: Celebration | null
  dismissCelebration: () => void

  // ---- navigation actions ----
  setScreen: (screen: Screen) => void
  selectList: (id: ID) => void
  selectTask: (id: ID | null) => void

  // ---- list actions ----
  addList: (name: string) => void
  renameList: (id: ID, name: string) => void
  deleteList: (id: ID) => void

  // ---- task actions ----
  addTask: (listId: ID, title: string) => void
  updateTask: (id: ID, patch: Partial<Omit<Task, 'id' | 'listId'>>) => void
  toggleTask: (id: ID) => void
  toggleStar: (id: ID) => void
  deleteTask: (id: ID) => void
  clearCompleted: (listId: ID) => void

  // ---- daily task actions ----
  addDailyTask: (title: string) => void
  renameDailyTask: (id: ID, title: string) => void
  deleteDailyTask: (id: ID) => void
  toggleDailyToday: (id: ID) => void
}

const now = () => new Date().toISOString()

/** A friendly starter dataset so the app isn't empty on first run. */
function seed(): Pick<State, 'lists' | 'tasks' | 'dailyTasks' | 'dailyLog'> {
  const listId = uid()
  return {
    lists: [{ id: listId, name: 'My Tasks', createdAt: now() }],
    tasks: [
      {
        id: uid(),
        listId,
        title: 'Welcome to TargetGoals Tasks 👋  Click me to add notes & a due date',
        notes: '',
        starred: true,
        completed: false,
        createdAt: now(),
      },
      {
        id: uid(),
        listId,
        title: 'Try the Daily tab — habits that reset every day',
        notes: '',
        starred: false,
        completed: false,
        createdAt: now(),
      },
    ],
    dailyTasks: [
      { id: uid(), title: 'Drink water', createdAt: now(), archived: false },
      { id: uid(), title: 'Exercise', createdAt: now(), archived: false },
      { id: uid(), title: 'Read 10 pages', createdAt: now(), archived: false },
    ],
    dailyLog: {},
  }
}

export const useStore = create<State>()(
  persist(
    (set) => {
      const initial = seed()
      return {
        ...initial,
        screen: 'tasks',
        currentListId: initial.lists[0]?.id ?? null,
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
            lists: [...s.lists, { id, name: trimmed, createdAt: now() }],
            screen: 'tasks',
            currentListId: id,
          }))
        },
        renameList: (id, name) => {
          const trimmed = name.trim()
          if (!trimmed) return
          set((s) => ({
            lists: s.lists.map((l) => (l.id === id ? { ...l, name: trimmed } : l)),
          }))
        },
        deleteList: (id) =>
          set((s) => {
            const lists = s.lists.filter((l) => l.id !== id)
            const tasks = s.tasks.filter((t) => t.listId !== id)
            const currentListId =
              s.currentListId === id ? lists[0]?.id ?? null : s.currentListId
            return { lists, tasks, currentListId }
          }),

        // ---- tasks ----
        addTask: (listId, title) => {
          const trimmed = title.trim()
          if (!trimmed) return
          set((s) => ({
            tasks: [
              ...s.tasks,
              {
                id: uid(),
                listId,
                title: trimmed,
                notes: '',
                starred: false,
                completed: false,
                createdAt: now(),
              },
            ],
          }))
        },
        updateTask: (id, patch) =>
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          })),
        toggleTask: (id) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    completed: !t.completed,
                    completedAt: !t.completed ? now() : undefined,
                  }
                : t,
            ),
          })),
        toggleStar: (id) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id ? { ...t, starred: !t.starred } : t,
            ),
          })),
        deleteTask: (id) =>
          set((s) => ({
            tasks: s.tasks.filter((t) => t.id !== id),
            selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
          })),
        clearCompleted: (listId) =>
          set((s) => ({
            tasks: s.tasks.filter((t) => !(t.listId === listId && t.completed)),
          })),

        // ---- daily tasks ----
        addDailyTask: (title) => {
          const trimmed = title.trim()
          if (!trimmed) return
          set((s) => ({
            dailyTasks: [
              ...s.dailyTasks,
              { id: uid(), title: trimmed, createdAt: now(), archived: false },
            ],
          }))
        },
        renameDailyTask: (id, title) => {
          const trimmed = title.trim()
          if (!trimmed) return
          set((s) => ({
            dailyTasks: s.dailyTasks.map((d) =>
              d.id === id ? { ...d, title: trimmed } : d,
            ),
          }))
        },
        deleteDailyTask: (id) =>
          set((s) => {
            // Remove the task and scrub it from the historical log.
            const dailyLog: DailyLog = {}
            for (const [k, ids] of Object.entries(s.dailyLog)) {
              const filtered = ids.filter((x) => x !== id)
              if (filtered.length) dailyLog[k] = filtered
            }
            return {
              dailyTasks: s.dailyTasks.filter((d) => d.id !== id),
              dailyLog,
            }
          }),
        toggleDailyToday: (id) =>
          set((s) => {
            const key = todayKey()
            const today = s.dailyLog[key] ?? []
            const has = today.includes(id)
            const next = has
              ? today.filter((x) => x !== id)
              : [...today, id]
            const dailyLog = { ...s.dailyLog }
            if (next.length) dailyLog[key] = next
            else delete dailyLog[key]

            // Surface a celebration only when completing (not un-checking).
            let celebration = s.celebration
            if (!has) {
              const activeIds = new Set(
                s.dailyTasks.filter((d) => !d.archived).map((d) => d.id),
              )
              const total = activeIds.size
              const doneActive = next.filter((x) => activeIds.has(x)).length
              const streak = computeStats(dailyLog).currentStreak
              if (total > 0 && doneActive === total) {
                // Completed everything for the day — the big one.
                celebration = { kind: 'allDone', streak, total }
              } else if (doneActive === 1) {
                // First task logged today — hot streak nudge.
                celebration = { kind: 'logged', streak, total }
              }
            }

            return { dailyLog, celebration }
          }),
      }
    },
    {
      name: 'tally-store-v1',
      version: 1,
      // Persist data + navigation only — never the transient celebration popup.
      partialize: (s) => ({
        lists: s.lists,
        tasks: s.tasks,
        dailyTasks: s.dailyTasks,
        dailyLog: s.dailyLog,
        screen: s.screen,
        currentListId: s.currentListId,
      }),
    },
  ),
)
