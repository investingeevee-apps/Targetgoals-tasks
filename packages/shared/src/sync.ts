/**
 * Wire format shared by the server and all clients (web, mobile).
 *
 * Every syncable entity carries two sync fields:
 *  - `updatedAt`: epoch milliseconds, the logical clock used for last-write-wins.
 *  - `deleted`:   soft-delete tombstone so deletions propagate between devices.
 *
 * Domain timestamps that the UI shows (`createdAt`, `completedAt`) stay as ISO
 * strings to match the existing client model; only the sync clock is numeric.
 */

export interface SyncMeta {
  updatedAt: number
  deleted: boolean
}

export interface ListDTO extends SyncMeta {
  id: string
  name: string
  createdAt: string
}

/** A checklist item embedded in a task. */
export interface Subtask {
  id: string
  title: string
  completed: boolean
}

/** A repeating schedule for a task. `null` recurrence = one-time (`scheduledDate`). */
export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly'
  /** weekly: days of week, 0=Sun .. 6=Sat. */
  weekdays?: number[]
  /** monthly: day of month, 1..31 (clamped to the month's length). */
  monthday?: number
}

export interface TaskDTO extends SyncMeta {
  id: string
  listId: string
  title: string
  notes: string
  due: string | null
  starred: boolean
  completed: boolean
  completedAt: string | null
  createdAt: string
  /** Embedded checklist; synced with the task. */
  subtasks: Subtask[]
  /** Manual sort position within the list (ascending). */
  order: number
  /** Goal this task belongs to as a milestone, or null. (Optional for back-compat.) */
  goalId?: string | null
  /** One-time "plan for" date (YYYY-MM-DD) — surfaces in Today on/after this date. */
  scheduledDate?: string | null
  /** Repeating schedule — surfaces in Today on each matching date. Null = one-time. */
  recurrence?: Recurrence | null
}

export interface DailyTaskDTO extends SyncMeta {
  id: string
  title: string
  archived: boolean
  createdAt: string
  /** Manual sort position (ascending). */
  order: number
  /** Goal this habit is linked to, or null. (Optional for back-compat.) */
  goalId?: string | null
}

export interface DailyCompletionDTO extends SyncMeta {
  id: string
  dailyTaskId: string
  dateKey: string
  createdAt: string
}

/** Per-occurrence completion of a *repeating* scheduled task (one row per task+date).
 * One-time scheduled tasks use the task's own `completed` flag instead. */
export interface ScheduledCompletionDTO extends SyncMeta {
  id: string
  taskId: string
  dateKey: string
  createdAt: string
}

export type GoalProgressMode = 'milestones' | 'metric' | 'habits'
export type GoalStatus = 'active' | 'achieved' | 'archived'

/** A point in a metric goal's progress history. */
export interface GoalProgressEntry {
  dateKey: string
  value: number
}

export interface GoalDTO extends SyncMeta {
  id: string
  title: string
  /** Motivation / "why". */
  why: string
  /** Deadline (YYYY-MM-DD) or null. */
  targetDate: string | null
  /** Which signal drives the headline %. */
  progressMode: GoalProgressMode
  /** Metric mode: target number, unit, and current value. */
  targetValue: number | null
  unit: string | null
  currentValue: number | null
  /** Metric mode: history of value updates, for the trend line. */
  progressLog: GoalProgressEntry[]
  status: GoalStatus
  createdAt: string
  /** Manual sort position (ascending). */
  order: number
}

export interface SettingDTO {
  key: string
  value: string
  updatedAt: number
}

/** A bundle of changed rows, per entity type. */
export interface SyncChanges {
  lists: ListDTO[]
  tasks: TaskDTO[]
  dailyTasks: DailyTaskDTO[]
  dailyCompletions: DailyCompletionDTO[]
  goals: GoalDTO[]
  scheduledCompletions: ScheduledCompletionDTO[]
  settings: SettingDTO[]
}

/** Client → server: push local changes and ask for everything newer than `since`. */
export interface SyncPushRequest {
  since: number
  changes: Partial<SyncChanges>
}

/** Server → client: the server clock plus all changes newer than the client's `since`. */
export interface SyncPullResponse {
  now: number
  changes: SyncChanges
}

/** Payload encoded into the pairing QR code. */
export interface PairingPayload {
  /** Base server URL the client should call, e.g. https://your-pc.tailnet.ts.net */
  url: string
  /** Bearer token for the Authorization header. */
  token: string
  /** Human-friendly server name. */
  name: string
}

export const EMPTY_CHANGES: SyncChanges = {
  lists: [],
  tasks: [],
  dailyTasks: [],
  dailyCompletions: [],
  goals: [],
  scheduledCompletions: [],
  settings: [],
}
