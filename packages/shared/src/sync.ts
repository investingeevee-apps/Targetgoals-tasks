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
}

export interface DailyTaskDTO extends SyncMeta {
  id: string
  title: string
  archived: boolean
  createdAt: string
}

export interface DailyCompletionDTO extends SyncMeta {
  id: string
  dailyTaskId: string
  dateKey: string
  createdAt: string
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
  settings: [],
}
