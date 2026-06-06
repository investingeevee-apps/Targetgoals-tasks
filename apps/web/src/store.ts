import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Celebration,
  DailyCompletionDTO,
  DailyTaskDTO,
  GoalDTO,
  GoalProgressMode,
  ID,
  ListDTO,
  Recurrence,
  ScheduledCompletionDTO,
  Screen,
  SyncChanges,
  TaskDTO,
} from '@targetgoals/shared'
import type { Subtask } from '@targetgoals/shared'
import { computeStreaks, todayKey } from '@targetgoals/shared'
import {
  STORE_KEY,
  convertLegacy,
  deriveInitialData,
  uid,
} from './lib/transform'

const nowIso = () => new Date().toISOString()
const nowMs = () => Date.now()

/** A dirty key plus the row's updatedAt when it was collected for a push, so we
 * only clear it after sync if the row hasn't been edited again in the meantime. */
type DirtySnapshot = { key: string; updatedAt: number }[]

/** Generic last-write-wins merge of incoming rows into a local array (by id).
 * Tie-break favors the LOCAL row (strict `>`): on an equal-timestamp collision a
 * server pull must not clobber an edit we already hold. */
function mergeById<T extends { id: string; updatedAt: number }>(
  local: T[],
  incoming: T[],
): T[] {
  if (!incoming.length) return local
  const map = new Map(local.map((r) => [r.id, r]))
  for (const row of incoming) {
    const cur = map.get(row.id)
    if (!cur || row.updatedAt > cur.updatedAt) map.set(row.id, row)
  }
  return Array.from(map.values())
}

interface State {
  // data (includes soft-deleted tombstones; selectors filter them out)
  lists: ListDTO[]
  tasks: TaskDTO[]
  dailyTasks: DailyTaskDTO[]
  dailyCompletions: DailyCompletionDTO[]
  goals: GoalDTO[]
  scheduledCompletions: ScheduledCompletionDTO[]

  // sync bookkeeping
  dirty: Record<string, true>
  lastSyncedAt: number

  // navigation
  screen: Screen
  currentListId: ID | null
  selectedTaskId: ID | null
  selectedGoalId: ID | null

  // transient UI (not persisted)
  celebration: Celebration | null
  dismissCelebration: () => void

  // ---- navigation ----
  setScreen: (screen: Screen) => void
  selectList: (id: ID) => void
  selectTask: (id: ID | null) => void
  selectGoal: (id: ID | null) => void

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
  moveTask: (id: ID, dir: 'up' | 'down') => void
  reorderTasks: (listId: ID, orderedIds: ID[]) => void

  // ---- subtasks ----
  addSubtask: (taskId: ID, title: string) => void
  toggleSubtask: (taskId: ID, subtaskId: ID) => void
  renameSubtask: (taskId: ID, subtaskId: ID, title: string) => void
  deleteSubtask: (taskId: ID, subtaskId: ID) => void
  reorderSubtasks: (taskId: ID, orderedIds: ID[]) => void

  // ---- daily tasks ----
  addDailyTask: (title: string) => string
  renameDailyTask: (id: ID, title: string) => void
  deleteDailyTask: (id: ID) => void
  toggleDailyToday: (id: ID) => void
  reorderDailyTasks: (orderedIds: ID[]) => void

  // ---- goals ----
  addGoal: (input: {
    title: string
    why?: string
    targetDate?: string | null
    progressMode?: GoalProgressMode
    targetValue?: number | null
    unit?: string | null
  }) => string
  updateGoal: (
    id: ID,
    patch: Partial<
      Pick<GoalDTO, 'title' | 'why' | 'targetDate' | 'progressMode' | 'targetValue' | 'unit'>
    >,
  ) => void
  setGoalProgress: (id: ID, value: number) => void
  achieveGoal: (id: ID) => void
  archiveGoal: (id: ID) => void
  reopenGoal: (id: ID) => void
  deleteGoal: (id: ID) => void
  reorderGoals: (orderedIds: ID[]) => void
  addMilestone: (goalId: ID, listId: ID, title: string) => void
  linkTaskToGoal: (taskId: ID, goalId: ID | null) => void
  linkHabitToGoal: (habitId: ID, goalId: ID | null) => void

  // ---- scheduling tasks into Today ----
  scheduleTask: (taskId: ID, date: string | null) => void
  setTaskRecurrence: (taskId: ID, rule: Recurrence | null) => void
  toggleScheduledToday: (taskId: ID, dateKey?: string) => void

  // ---- sync integration (called by the sync engine) ----
  collectDirty: () => { changes: Partial<SyncChanges>; synced: DirtySnapshot }
  applyServerChanges: (changes: Partial<SyncChanges>) => void
  markSynced: (serverNow: number, synced: DirtySnapshot) => void
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
        goals: [],
        scheduledCompletions: [],
        screen: 'tasks',
        currentListId: initial.lists.find((l) => !l.deleted)?.id ?? null,
        selectedTaskId: null,
        selectedGoalId: null,
        celebration: null,

        dismissCelebration: () => set({ celebration: null }),

        // ---- navigation ----
        setScreen: (screen) => set({ screen, selectedTaskId: null, selectedGoalId: null }),
        selectList: (id) =>
          set({ screen: 'tasks', currentListId: id, selectedTaskId: null }),
        selectTask: (id) => set({ selectedTaskId: id }),
        selectGoal: (id) => set({ screen: 'goals', selectedGoalId: id }),

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
                subtasks: [],
                // new tasks go to the top of the list
                order:
                  Math.min(
                    0,
                    ...s.tasks
                      .filter((t) => t.listId === listId && !t.deleted)
                      .map((t) => t.order),
                  ) - 1,
              },
            ],
            dirty: dirtyWith(s, 'task', id),
          }))
        },
        updateTask: (id, patch) =>
          set((s) => {
            // Ignore a blank/whitespace-only title so a task can't become an
            // invisible empty row (other fields in the patch still apply).
            const clean = { ...patch }
            if ('title' in clean && !clean.title?.trim()) delete clean.title
            return {
              tasks: s.tasks.map((t) =>
                t.id === id ? { ...t, ...clean, updatedAt: nowMs() } : t,
              ),
              dirty: dirtyWith(s, 'task', id),
            }
          }),
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
        moveTask: (id, dir) =>
          set((s) => {
            const task = s.tasks.find((t) => t.id === id)
            if (!task) return {}
            // active tasks in this list, in display order
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
        reorderTasks: (listId, orderedIds) =>
          set((s) => {
            const pos = new Map(orderedIds.map((id, i) => [id, i]))
            const now = nowMs()
            const dirty = { ...s.dirty }
            const tasks = s.tasks.map((t) => {
              if (t.listId !== listId) return t
              const next = pos.get(t.id)
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
              t.id === taskId
                ? { ...t, subtasks: [...t.subtasks, sub], updatedAt: nowMs() }
                : t,
            ),
            dirty: dirtyWith(s, 'task', taskId),
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
            dirty: dirtyWith(s, 'task', taskId),
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
            dirty: dirtyWith(s, 'task', taskId),
          }))
        },
        deleteSubtask: (taskId, subtaskId) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== subtaskId), updatedAt: nowMs() }
                : t,
            ),
            dirty: dirtyWith(s, 'task', taskId),
          })),
        reorderSubtasks: (taskId, orderedIds) =>
          set((s) => ({
            tasks: s.tasks.map((t) => {
              if (t.id !== taskId) return t
              const byId = new Map(t.subtasks.map((st) => [st.id, st]))
              const subtasks = orderedIds
                .map((id) => byId.get(id))
                .filter((st): st is NonNullable<typeof st> => st !== undefined)
              return { ...t, subtasks, updatedAt: nowMs() }
            }),
            dirty: dirtyWith(s, 'task', taskId),
          })),

        // ---- daily tasks ----
        addDailyTask: (title) => {
          const trimmed = title.trim()
          if (!trimmed) return ''
          const id = uid()
          set((s) => ({
            dailyTasks: [
              ...s.dailyTasks,
              {
                id,
                title: trimmed,
                archived: false,
                createdAt: nowIso(),
                updatedAt: nowMs(),
                deleted: false,
                order:
                  Math.max(0, ...s.dailyTasks.filter((d) => !d.deleted).map((d) => d.order + 1)),
              },
            ],
            dirty: dirtyWith(s, 'dailyTask', id),
          }))
          return id
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
        reorderDailyTasks: (orderedIds) =>
          set((s) => {
            const pos = new Map(orderedIds.map((id, i) => [id, i]))
            const now = nowMs()
            const dirty = { ...s.dirty }
            const dailyTasks = s.dailyTasks.map((d) => {
              const next = pos.get(d.id)
              if (next !== undefined && d.order !== next) {
                dirty[`dailyTask:${d.id}`] = true
                return { ...d, order: next, updatedAt: now }
              }
              return d
            })
            return { dailyTasks, dirty }
          }),

        // ---- goals ----
        addGoal: (input) => {
          const id = uid()
          const t = nowMs()
          const today = todayKey()
          const metric = input.progressMode === 'metric'
          set((s) => ({
            goals: [
              ...s.goals,
              {
                id,
                title: input.title.trim(),
                why: input.why?.trim() ?? '',
                targetDate: input.targetDate ?? null,
                progressMode: input.progressMode ?? 'milestones',
                targetValue: input.targetValue ?? null,
                unit: input.unit ?? null,
                currentValue: metric ? 0 : null,
                progressLog: metric ? [{ dateKey: today, value: 0 }] : [],
                status: 'active',
                createdAt: nowIso(),
                updatedAt: t,
                deleted: false,
                order: Math.max(0, ...s.goals.filter((g) => !g.deleted).map((g) => g.order + 1)),
              },
            ],
            dirty: dirtyWith(s, 'goal', id),
          }))
          return id
        },
        updateGoal: (id, patch) =>
          set((s) => ({
            goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: nowMs() } : g)),
            dirty: dirtyWith(s, 'goal', id),
          })),
        setGoalProgress: (id, value) =>
          set((s) => {
            const today = todayKey()
            return {
              goals: s.goals.map((g) => {
                if (g.id !== id) return g
                const log = [
                  ...(g.progressLog ?? []).filter((e) => e.dateKey !== today),
                  { dateKey: today, value },
                ].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
                return { ...g, currentValue: value, progressLog: log, updatedAt: nowMs() }
              }),
              dirty: dirtyWith(s, 'goal', id),
            }
          }),
        achieveGoal: (id) =>
          set((s) => {
            const g = s.goals.find((x) => x.id === id)
            return {
              goals: s.goals.map((x) =>
                x.id === id ? { ...x, status: 'achieved', updatedAt: nowMs() } : x,
              ),
              dirty: dirtyWith(s, 'goal', id),
              celebration: g ? { kind: 'goal', streak: 0, total: 0, title: g.title } : s.celebration,
            }
          }),
        archiveGoal: (id) =>
          set((s) => ({
            goals: s.goals.map((g) =>
              g.id === id ? { ...g, status: 'archived', updatedAt: nowMs() } : g,
            ),
            dirty: dirtyWith(s, 'goal', id),
          })),
        reopenGoal: (id) =>
          set((s) => ({
            goals: s.goals.map((g) =>
              g.id === id ? { ...g, status: 'active', updatedAt: nowMs() } : g,
            ),
            dirty: dirtyWith(s, 'goal', id),
          })),
        deleteGoal: (id) =>
          set((s) => {
            const t = nowMs()
            const dirty = { ...s.dirty, [`goal:${id}`]: true as const }
            // detach (don't delete) linked milestones + habits
            const tasks = s.tasks.map((task) => {
              if (task.goalId !== id) return task
              dirty[`task:${task.id}`] = true
              return { ...task, goalId: null, updatedAt: t }
            })
            const dailyTasks = s.dailyTasks.map((d) => {
              if (d.goalId !== id) return d
              dirty[`dailyTask:${d.id}`] = true
              return { ...d, goalId: null, updatedAt: t }
            })
            const goals = s.goals.map((g) =>
              g.id === id ? { ...g, deleted: true, updatedAt: t } : g,
            )
            return {
              goals,
              tasks,
              dailyTasks,
              dirty,
              selectedGoalId: s.selectedGoalId === id ? null : s.selectedGoalId,
            }
          }),
        reorderGoals: (orderedIds) =>
          set((s) => {
            const pos = new Map(orderedIds.map((id, i) => [id, i]))
            const now = nowMs()
            const dirty = { ...s.dirty }
            const goals = s.goals.map((g) => {
              const next = pos.get(g.id)
              if (next !== undefined && g.order !== next) {
                dirty[`goal:${g.id}`] = true
                return { ...g, order: next, updatedAt: now }
              }
              return g
            })
            return { goals, dirty }
          }),
        addMilestone: (goalId, listId, title) => {
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
                order: 0,
                goalId,
                scheduledDate: null,
                recurrence: null,
              },
            ],
            dirty: dirtyWith(s, 'task', id),
          }))
        },
        linkTaskToGoal: (taskId, goalId) =>
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, goalId, updatedAt: nowMs() } : t)),
            dirty: dirtyWith(s, 'task', taskId),
          })),
        linkHabitToGoal: (habitId, goalId) =>
          set((s) => ({
            dailyTasks: s.dailyTasks.map((d) =>
              d.id === habitId ? { ...d, goalId, updatedAt: nowMs() } : d,
            ),
            dirty: dirtyWith(s, 'dailyTask', habitId),
          })),

        // ---- scheduling tasks into Today ----
        scheduleTask: (taskId, date) =>
          set((s) => ({
            // a one-time date and a repeat are mutually exclusive
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? { ...t, scheduledDate: date, recurrence: date ? null : t.recurrence, updatedAt: nowMs() }
                : t,
            ),
            dirty: dirtyWith(s, 'task', taskId),
          })),
        setTaskRecurrence: (taskId, rule) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? { ...t, recurrence: rule, scheduledDate: rule ? null : t.scheduledDate, updatedAt: nowMs() }
                : t,
            ),
            dirty: dirtyWith(s, 'task', taskId),
          })),
        toggleScheduledToday: (taskId, dateKey) =>
          set((s) => {
            const key = dateKey ?? todayKey()
            const task = s.tasks.find((t) => t.id === taskId)
            if (!task) return {}
            // repeating task → per-occurrence completion record
            if (task.recurrence) {
              const existing = s.scheduledCompletions.find(
                (c) => c.taskId === taskId && c.dateKey === key,
              )
              if (existing) {
                return {
                  scheduledCompletions: s.scheduledCompletions.map((c) =>
                    c.id === existing.id
                      ? { ...c, deleted: !existing.deleted, updatedAt: nowMs() }
                      : c,
                  ),
                  dirty: { ...s.dirty, [`schedCompletion:${existing.id}`]: true },
                }
              }
              const id = uid()
              return {
                scheduledCompletions: [
                  ...s.scheduledCompletions,
                  { id, taskId, dateKey: key, createdAt: nowIso(), updatedAt: nowMs(), deleted: false },
                ],
                dirty: { ...s.dirty, [`schedCompletion:${id}`]: true },
              }
            }
            // one-time scheduled task → complete the underlying task
            return {
              tasks: s.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      completed: !t.completed,
                      completedAt: !t.completed ? nowIso() : null,
                      updatedAt: nowMs(),
                    }
                  : t,
              ),
              dirty: dirtyWith(s, 'task', taskId),
            }
          }),

        // ---- sync integration ----
        collectDirty: () => {
          const s = get()
          const changes: Partial<SyncChanges> = {
            lists: [],
            tasks: [],
            dailyTasks: [],
            dailyCompletions: [],
            goals: [],
            scheduledCompletions: [],
          }
          const synced: DirtySnapshot = []
          for (const key of Object.keys(s.dirty)) {
            const sep = key.indexOf(':')
            const kind = key.slice(0, sep)
            const id = key.slice(sep + 1)
            let row: { updatedAt: number } | undefined
            if (kind === 'list') {
              const r = s.lists.find((x) => x.id === id)
              if (r) changes.lists!.push(r)
              row = r
            } else if (kind === 'task') {
              const r = s.tasks.find((x) => x.id === id)
              if (r) changes.tasks!.push(r)
              row = r
            } else if (kind === 'dailyTask') {
              const r = s.dailyTasks.find((x) => x.id === id)
              if (r) changes.dailyTasks!.push(r)
              row = r
            } else if (kind === 'completion') {
              const r = s.dailyCompletions.find((x) => x.id === id)
              if (r) changes.dailyCompletions!.push(r)
              row = r
            } else if (kind === 'goal') {
              const r = s.goals.find((x) => x.id === id)
              if (r) changes.goals!.push(r)
              row = r
            } else if (kind === 'schedCompletion') {
              const r = s.scheduledCompletions.find((x) => x.id === id)
              if (r) changes.scheduledCompletions!.push(r)
              row = r
            }
            // -1 sentinel = no row found; markSynced will clear it (nothing to keep).
            synced.push({ key, updatedAt: row?.updatedAt ?? -1 })
          }
          return { changes, synced }
        },
        applyServerChanges: (changes) =>
          set((s) => {
            // Never let a server pull overwrite a row we've edited but not yet
            // pushed — the local dirty version is the authoritative latest edit.
            const fresh = <T extends { id: string }>(kind: string, rows: T[] | undefined) =>
              (rows ?? []).filter((r) => !s.dirty[`${kind}:${r.id}`])
            return {
              lists: mergeById(s.lists, fresh('list', changes.lists)),
              tasks: mergeById(s.tasks, fresh('task', changes.tasks)),
              dailyTasks: mergeById(s.dailyTasks, fresh('dailyTask', changes.dailyTasks)),
              dailyCompletions: mergeById(
                s.dailyCompletions,
                fresh('completion', changes.dailyCompletions),
              ),
              goals: mergeById(s.goals, fresh('goal', changes.goals)),
              scheduledCompletions: mergeById(
                s.scheduledCompletions,
                fresh('schedCompletion', changes.scheduledCompletions),
              ),
            }
          }),
        markSynced: (serverNow, synced) =>
          set((s) => {
            const dirty = { ...s.dirty }
            for (const { key, updatedAt } of synced) {
              const sep = key.indexOf(':')
              const kind = key.slice(0, sep)
              const id = key.slice(sep + 1)
              const arr =
                kind === 'list'
                  ? s.lists
                  : kind === 'task'
                    ? s.tasks
                    : kind === 'dailyTask'
                      ? s.dailyTasks
                      : kind === 'completion'
                        ? s.dailyCompletions
                        : kind === 'goal'
                          ? s.goals
                          : kind === 'schedCompletion'
                            ? s.scheduledCompletions
                            : undefined
              const row = arr?.find((r) => r.id === id)
              // Clear only if the row is gone or hasn't been re-edited since we
              // collected it. A row edited mid-flight stays dirty for next sync.
              if (!row || row.updatedAt === updatedAt) delete dirty[key]
            }
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
      version: 4,
      // Backfill fields added after a user's data was first saved (subtasks/order;
      // goals + scheduledCompletions arrays).
      migrate: (state: unknown) => {
        // Guard a nullish/corrupt persisted value so we fall back cleanly instead
        // of crashing rehydration.
        if (!state || typeof state !== 'object') return state as never
        const s = state as {
          tasks?: TaskDTO[]
          dailyTasks?: DailyTaskDTO[]
          goals?: GoalDTO[]
          scheduledCompletions?: ScheduledCompletionDTO[]
        }
        const tasks = Array.isArray(s.tasks)
          ? s.tasks.map((t, i) => ({ ...t, subtasks: t.subtasks ?? [], order: t.order ?? i }))
          : s.tasks
        const dailyTasks = Array.isArray(s.dailyTasks)
          ? s.dailyTasks.map((d, i) => ({ ...d, order: d.order ?? i }))
          : s.dailyTasks
        return {
          ...s,
          tasks,
          dailyTasks,
          goals: Array.isArray(s.goals) ? s.goals : [],
          scheduledCompletions: Array.isArray(s.scheduledCompletions) ? s.scheduledCompletions : [],
        } as never
      },
      partialize: (s) => ({
        lists: s.lists,
        tasks: s.tasks,
        dailyTasks: s.dailyTasks,
        dailyCompletions: s.dailyCompletions,
        goals: s.goals,
        scheduledCompletions: s.scheduledCompletions,
        dirty: s.dirty,
        lastSyncedAt: s.lastSyncedAt,
        screen: s.screen,
        currentListId: s.currentListId,
      }),
    },
  ),
)
