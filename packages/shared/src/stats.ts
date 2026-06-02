import type { DailyLog } from './types'
import type { DailyCompletionDTO, DailyTaskDTO } from './sync'
import { addDays, dayDiff, toKey, todayKey } from './dates'

export interface Stats {
  totalCompletions: number
  activeDays: number
  currentStreak: number
  longestStreak: number
  /** Date key of the very first logged completion, or null. */
  firstDay: string | null
  bestDay: { date: string; count: number } | null
}

/** All date keys that have at least one completion. */
function activeKeys(log: DailyLog): string[] {
  return Object.keys(log).filter((k) => (log[k]?.length ?? 0) > 0).sort()
}

export function computeStats(log: DailyLog): Stats {
  const keys = activeKeys(log)
  const set = new Set(keys)

  const totalCompletions = keys.reduce((sum, k) => sum + log[k].length, 0)
  const activeDays = keys.length

  // current streak: walk back from today, with a one-day grace if today
  // isn't done yet (so the streak survives until you miss a full day).
  let currentStreak = 0
  let cursor = todayKey()
  if (!set.has(cursor)) cursor = addDays(cursor, -1)
  while (set.has(cursor)) {
    currentStreak++
    cursor = addDays(cursor, -1)
  }

  // longest streak across all history
  let longestStreak = 0
  let run = 0
  let prev: string | null = null
  for (const k of keys) {
    if (prev && dayDiff(k, prev) === 1) run++
    else run = 1
    if (run > longestStreak) longestStreak = run
    prev = k
  }

  let bestDay: Stats['bestDay'] = null
  for (const k of keys) {
    const count = log[k].length
    if (!bestDay || count > bestDay.count) bestDay = { date: k, count }
  }

  return {
    totalCompletions,
    activeDays,
    currentStreak,
    longestStreak,
    firstDay: keys[0] ?? null,
    bestDay,
  }
}

export interface Streaks {
  currentStreak: number
  longestStreak: number
}

/** Local 'YYYY-MM-DD' for an ISO timestamp. */
function isoDay(iso: string): string {
  return toKey(new Date(iso))
}

/**
 * Perfect-day streaks: a day counts only when EVERY habit that existed that day
 * (created on/before it, currently active) was completed. So unchecking any habit
 * — e.g. undoing a misclick — drops today from the streak. Today gets a grace
 * period: an incomplete today doesn't break a streak earned through yesterday.
 */
export function computeStreaks(
  dailyTasks: DailyTaskDTO[],
  completions: DailyCompletionDTO[],
): Streaks {
  const active = dailyTasks
    .filter((d) => !d.deleted && !d.archived)
    .map((d) => ({ id: d.id, since: isoDay(d.createdAt) }))
  if (active.length === 0) return { currentStreak: 0, longestStreak: 0 }

  const today = todayKey()
  const byDay = new Map<string, Set<string>>()
  let firstDay = today
  for (const c of completions) {
    if (c.deleted) continue
    let set = byDay.get(c.dateKey)
    if (!set) byDay.set(c.dateKey, (set = new Set()))
    set.add(c.dailyTaskId)
    if (c.dateKey < firstDay) firstDay = c.dateKey
  }

  const isPerfect = (day: string): boolean => {
    const required = active.filter((h) => h.since <= day)
    if (required.length === 0) return false
    const done = byDay.get(day)
    if (!done) return false
    return required.every((h) => done.has(h.id))
  }

  // current streak — grace for today
  let currentStreak = 0
  let cursor = today
  if (!isPerfect(cursor)) cursor = addDays(cursor, -1)
  while (isPerfect(cursor)) {
    currentStreak++
    cursor = addDays(cursor, -1)
  }

  // longest streak across history
  let longestStreak = 0
  let run = 0
  for (let d = firstDay; d <= today; d = addDays(d, 1)) {
    if (isPerfect(d)) {
      run++
      if (run > longestStreak) longestStreak = run
    } else {
      run = 0
    }
  }

  return { currentStreak, longestStreak }
}

export interface HeatmapDay {
  key: string
  count: number
}

/**
 * Build a contribution-style grid: `weeks` columns of 7 days each, ending on
 * today. The last column is the current week; earlier columns go back in time.
 */
export function buildHeatmap(log: DailyLog, weeks = 18): HeatmapDay[][] {
  const today = todayKey()
  // Find the most recent Saturday (end of the grid's last column) so columns
  // align to weeks. We render Sun..Sat rows.
  const todayDow = new Date(today + 'T00:00:00').getDay() // 0=Sun..6=Sat
  const lastDayKey = addDays(today, 6 - todayDow) // upcoming Saturday
  const totalDays = weeks * 7
  const startKey = addDays(lastDayKey, -(totalDays - 1))

  const columns: HeatmapDay[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: HeatmapDay[] = []
    for (let d = 0; d < 7; d++) {
      const key = addDays(startKey, w * 7 + d)
      col.push({ key, count: log[key]?.length ?? 0 })
    }
    columns.push(col)
  }
  return columns
}

/** Map a completion count to one of five intensity buckets (0–4). */
export function intensity(count: number, max: number): number {
  if (count <= 0) return 0
  if (max <= 1) return 4
  const ratio = count / max
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}
