import type { DailyLog } from './types'
import type { DailyCompletionDTO, DailyTaskDTO } from './sync'
import { addDays, dayDiff, fromKey, todayKey } from './dates'

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

/**
 * Daily streaks: a day counts toward the streak when you complete AT LEAST ONE
 * habit that day. This is robust across the daily reset and adding/removing
 * habits, and it preserves history-based streaks. Today gets a grace period, so
 * an unfinished today doesn't break a streak earned through yesterday.
 *
 * (`_dailyTasks` is accepted for call-site compatibility but not needed.)
 */
export function computeStreaks(
  _dailyTasks: DailyTaskDTO[],
  completions: DailyCompletionDTO[],
): Streaks {
  const activeDays = new Set<string>()
  for (const c of completions) {
    if (!c.deleted) activeDays.add(c.dateKey)
  }
  if (activeDays.size === 0) return { currentStreak: 0, longestStreak: 0 }

  const today = todayKey()

  // current streak — grace for today (count back from today, or yesterday if
  // today isn't logged yet)
  let currentStreak = 0
  let cursor = today
  if (!activeDays.has(cursor)) cursor = addDays(cursor, -1)
  while (activeDays.has(cursor)) {
    currentStreak++
    cursor = addDays(cursor, -1)
  }

  // longest streak across all history
  const days = Array.from(activeDays).sort()
  let longestStreak = 0
  let run = 0
  let prev: string | null = null
  for (const d of days) {
    run = prev && dayDiff(d, prev) === 1 ? run + 1 : 1
    if (run > longestStreak) longestStreak = run
    prev = d
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
  const todayDow = fromKey(today).getDay() // 0=Sun..6=Sat (local, consistent with rest of module)
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

export interface YearCell {
  /** Local date key, or null for a day that doesn't exist in the month (e.g. Feb 30). */
  key: string | null
  count: number
}

/**
 * Calendar-board grid for a single year: 12 month-columns, each a column of 31
 * day-rows (day 1 at index 0 … day 31 at index 30). Days that don't exist in a
 * month (Feb 30/31, Apr 31, …) get `key: null` so the caller can render a gap.
 */
export function buildYearGrid(log: DailyLog, year: number): YearCell[][] {
  const months: YearCell[][] = []
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate()
    const col: YearCell[] = []
    for (let d = 1; d <= 31; d++) {
      if (d > daysInMonth) {
        col.push({ key: null, count: 0 })
        continue
      }
      const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      col.push({ key, count: log[key]?.length ?? 0 })
    }
    months.push(col)
  }
  return months
}

/** 7 cells (Sunday→Saturday) for the week containing `anchor`. */
export function buildWeekGrid(log: DailyLog, anchor: string): YearCell[] {
  const dow = fromKey(anchor).getDay() // 0=Sun
  const sunday = addDays(anchor, -dow)
  const cells: YearCell[] = []
  for (let i = 0; i < 7; i++) {
    const key = addDays(sunday, i)
    cells.push({ key, count: log[key]?.length ?? 0 })
  }
  return cells
}

/**
 * Calendar weeks for a month: each row is 7 cells (Sunday→Saturday). Days that
 * fall outside the month (leading/trailing padding) get `key: null`.
 */
export function buildMonthGrid(log: DailyLog, year: number, month: number): YearCell[][] {
  const mm = String(month + 1).padStart(2, '0')
  const firstDow = fromKey(`${year}-${mm}-01`).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: YearCell[][] = []
  let week: YearCell[] = []
  for (let i = 0; i < firstDow; i++) week.push({ key: null, count: 0 })
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${mm}-${String(d).padStart(2, '0')}`
    week.push({ key, count: log[key]?.length ?? 0 })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({ key: null, count: 0 })
    weeks.push(week)
  }
  return weeks
}

/** Sorted, unique years that have at least one logged completion. */
export function yearsWithData(log: DailyLog): number[] {
  const years = new Set<number>()
  for (const k of Object.keys(log)) {
    if (log[k] && log[k].length > 0) years.add(Number(k.slice(0, 4)))
  }
  return [...years].sort((a, b) => a - b)
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
