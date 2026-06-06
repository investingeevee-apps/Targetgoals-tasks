export type ID = string

/** A regular task list (the classic Google Tasks experience). */
export interface TaskList {
  id: ID
  name: string
  createdAt: string
}

/** A single task inside a regular list. */
export interface Task {
  id: ID
  listId: ID
  title: string
  notes: string
  /** Due date as a local 'YYYY-MM-DD' key, or undefined for no due date. */
  due?: string
  starred: boolean
  completed: boolean
  /** ISO datetime the task was last marked complete. */
  completedAt?: string
  createdAt: string
}

/**
 * A recurring daily task. These never "complete" permanently — instead each
 * day's completion is recorded in `dailyLog`, and the checklist resets every
 * day at local midnight.
 */
export interface DailyTask {
  id: ID
  title: string
  createdAt: string
  /** Archived daily tasks stop showing in the checklist but keep their history. */
  archived: boolean
}

/** dateKey ('YYYY-MM-DD') -> ids of daily tasks completed that day. */
export type DailyLog = Record<string, ID[]>

export type Screen = 'tasks' | 'daily' | 'overview' | 'goals' | 'help'

/**
 * A transient celebration event surfaced as a popup. Not persisted.
 * - `logged`: the user completed their FIRST daily task of the day.
 * - `allDone`: the user completed ALL of their daily tasks for the day.
 */
export interface Celebration {
  kind: 'logged' | 'allDone'
  streak: number
  total: number
}
