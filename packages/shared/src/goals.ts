import type { DailyCompletionDTO, DailyTaskDTO, GoalDTO, TaskDTO } from './sync'
import { addDays, dayDiff, todayKey } from './dates'

export interface GoalProgress {
  /** 0..100, the headline figure. */
  percent: number
  done: number
  total: number
  /** Human label, e.g. "3 / 8 steps", "12 / 24 books", "67% consistency". */
  label: string
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}
function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/**
 * Headline progress for a goal, from its chosen mode:
 *  - milestones: completed linked tasks / total
 *  - metric:     currentValue / targetValue
 *  - habits:     completions of linked habits over a window / (habits * windowDays)
 */
export function computeGoalProgress(
  goal: GoalDTO,
  milestones: TaskDTO[],
  habits: DailyTaskDTO[],
  completions: DailyCompletionDTO[],
  windowDays = 28,
): GoalProgress {
  if (goal.status === 'achieved') return { percent: 100, done: 0, total: 0, label: 'Achieved' }

  switch (goal.progressMode) {
    case 'metric': {
      const target = goal.targetValue ?? 0
      const cur = goal.currentValue ?? 0
      const percent = target > 0 ? clampPct((cur / target) * 100) : 0
      const unit = goal.unit ? ` ${goal.unit}` : ''
      const label = target > 0 ? `${trim(cur)} / ${trim(target)}${unit}` : 'No target set'
      return { percent, done: cur, total: target, label }
    }
    case 'habits': {
      const ids = new Set(habits.map((h) => h.id))
      if (ids.size === 0) return { percent: 0, done: 0, total: 0, label: 'No habits yet' }
      const today = todayKey()
      let done = 0
      for (const c of completions) {
        if (c.deleted || !ids.has(c.dailyTaskId)) continue
        const age = dayDiff(today, c.dateKey)
        if (age >= 0 && age < windowDays) done++
      }
      const total = ids.size * windowDays
      const percent = total > 0 ? clampPct((done / total) * 100) : 0
      return { percent, done, total, label: `${percent}% consistency` }
    }
    case 'milestones':
    default: {
      const total = milestones.length
      const done = milestones.filter((m) => m.completed).length
      const percent = total > 0 ? clampPct((done / total) * 100) : 0
      return { percent, done, total, label: `${done} / ${total} steps` }
    }
  }
}

export type Pace = 'ahead' | 'onTrack' | 'behind' | 'noDeadline' | 'done'

/** On-track read: progress vs the fraction of time elapsed toward the target date. */
export function paceStatus(goal: GoalDTO, percent: number): Pace {
  if (percent >= 100) return 'done'
  if (!goal.targetDate) return 'noDeadline'
  // Deadline already passed and not complete → behind, regardless of pace.
  if (dayDiff(goal.targetDate, todayKey()) < 0) return 'behind'
  const start = goal.createdAt.slice(0, 10)
  const totalDays = dayDiff(goal.targetDate, start)
  if (totalDays <= 0) return 'onTrack'
  const elapsed = dayDiff(todayKey(), start)
  const expected = clampPct((elapsed / totalDays) * 100)
  if (percent >= expected + 5) return 'ahead'
  if (percent <= expected - 5) return 'behind'
  return 'onTrack'
}

/** Projected finish date for a metric goal from its average pace, or null if unknown. */
export function projectedFinish(goal: GoalDTO): string | null {
  if (goal.progressMode !== 'metric') return null
  const target = goal.targetValue ?? 0
  const cur = goal.currentValue ?? 0
  if (target <= 0 || cur <= 0 || cur >= target) return null
  const log = goal.progressLog
  if (!log || log.length < 2) return null
  const first = log[0]
  const last = log[log.length - 1]
  const days = dayDiff(last.dateKey, first.dateKey)
  const gained = last.value - first.value
  if (days <= 0 || gained <= 0) return null
  const daysLeft = Math.ceil((target - cur) / (gained / days))
  if (daysLeft <= 0) return null // already at/past pace — don't show a past date
  return addDays(todayKey(), daysLeft)
}

/** Days remaining until the target date (negative = overdue), or null if none. */
export function daysUntil(targetDate: string | null): number | null {
  if (!targetDate) return null
  return dayDiff(targetDate, todayKey())
}
