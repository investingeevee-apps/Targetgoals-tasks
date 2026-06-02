import type { DailyLog } from './types'
import { addDays, dayDiff, todayKey } from './dates'

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
