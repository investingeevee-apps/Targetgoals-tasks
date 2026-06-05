import type { ScheduledCompletionDTO, TaskDTO } from './sync'
import { occursOn } from './recurs'

export interface AgendaItem {
  task: TaskDTO
  /** true = a repeating occurrence; false = a one-time scheduled task. */
  repeating: boolean
  /** one-time task whose scheduled date is in the past and still not done. */
  overdue: boolean
  /** done for `today` (repeating: has an occurrence completion; one-time: n/a here). */
  done: boolean
}

/**
 * The scheduled tasks that should appear in Today:
 *  - one-time  → `scheduledDate <= today` and not completed (carry-over while overdue).
 *  - repeating → recurrence occurs on `today`; `done` reflects an occurrence completion.
 * Sorted overdue-first, then by scheduled date / title.
 */
export function todayAgenda(
  tasks: TaskDTO[],
  scheduledCompletions: ScheduledCompletionDTO[],
  today: string,
): AgendaItem[] {
  const doneToday = new Set(
    scheduledCompletions.filter((c) => !c.deleted && c.dateKey === today).map((c) => c.taskId),
  )

  const items: AgendaItem[] = []
  for (const t of tasks) {
    if (t.deleted) continue
    if (t.recurrence) {
      if (occursOn(t.recurrence, today)) {
        items.push({ task: t, repeating: true, overdue: false, done: doneToday.has(t.id) })
      }
    } else if (t.scheduledDate && !t.completed && t.scheduledDate <= today) {
      items.push({ task: t, repeating: false, overdue: t.scheduledDate < today, done: false })
    }
  }

  items.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    const ad = a.task.scheduledDate ?? today
    const bd = b.task.scheduledDate ?? today
    return ad.localeCompare(bd) || a.task.title.localeCompare(b.task.title)
  })
  return items
}
