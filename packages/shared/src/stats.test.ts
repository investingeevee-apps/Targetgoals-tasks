import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { DailyCompletionDTO } from './sync'
import type { DailyLog } from './types'
import { addDays, todayKey } from './dates'
import { buildHeatmap, buildYearGrid, computeStats, computeStreaks, intensity, yearsWithData } from './stats'

/** Build a completion on a given date key. */
function comp(dateKey: string, deleted = false): DailyCompletionDTO {
  return {
    id: `${dateKey}-${Math.abs(hash(dateKey))}`,
    dailyTaskId: 'h1',
    dateKey,
    createdAt: dateKey,
    updatedAt: 1,
    deleted,
  }
}
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
const day = (n: number) => addDays(todayKey(), n)

// ---- computeStreaks (activity-based, grace-for-today) ----

test('no completions → zero streak', () => {
  assert.deepEqual(computeStreaks([], []), { currentStreak: 0, longestStreak: 0 })
})

test('completing today → current streak 1', () => {
  const s = computeStreaks([], [comp(day(0))])
  assert.equal(s.currentStreak, 1)
})

test('today not done but yesterday+before are → grace keeps streak', () => {
  const s = computeStreaks([], [comp(day(-1)), comp(day(-2))])
  assert.equal(s.currentStreak, 2) // grace for today, counts back through yesterday
})

test('grace expires once yesterday is also missed', () => {
  const s = computeStreaks([], [comp(day(-2)), comp(day(-3))])
  assert.equal(s.currentStreak, 0) // neither today nor yesterday done
})

test('deleted completions are ignored', () => {
  const s = computeStreaks([], [comp(day(0)), comp(day(-1), true)])
  assert.equal(s.currentStreak, 1) // yesterday tombstoned → no 2-day streak
})

test('longest streak spans a gap correctly', () => {
  const comps = [day(-6), day(-5), day(-4), day(-2), day(-1), day(0)].map((d) => comp(d))
  const s = computeStreaks([], comps)
  assert.equal(s.longestStreak, 3) // -2,-1,0 (and -6,-5,-4) are the runs
  assert.equal(s.currentStreak, 3)
})

// ---- computeStats (DailyLog-based) ----

test('computeStats current streak with grace', () => {
  const log: DailyLog = { [day(-1)]: ['a'], [day(-2)]: ['a', 'b'] }
  const stats = computeStats(log)
  assert.equal(stats.currentStreak, 2)
  assert.equal(stats.totalCompletions, 3)
  assert.equal(stats.activeDays, 2)
  assert.deepEqual(stats.bestDay, { date: day(-2), count: 2 })
})

// ---- heatmap ----

test('buildHeatmap returns weeks columns of 7 days, today included', () => {
  const grid = buildHeatmap({ [day(0)]: ['a'] }, 18)
  assert.equal(grid.length, 18)
  for (const col of grid) assert.equal(col.length, 7)
  const flat = grid.flat()
  const todayCell = flat.find((c) => c.key === day(0))
  assert.ok(todayCell, 'today should be in the grid')
  assert.equal(todayCell!.count, 1)
})

test('intensity buckets', () => {
  assert.equal(intensity(0, 4), 0)
  assert.equal(intensity(1, 1), 4)
  assert.equal(intensity(4, 4), 4)
  assert.equal(intensity(1, 4), 1)
})

test('buildYearGrid lays out 12 months x 31 days with valid/null cells', () => {
  const log: DailyLog = { '2026-01-01': ['h1', 'h2'], '2026-03-15': ['h1'] }
  const grid = buildYearGrid(log, 2026)
  assert.equal(grid.length, 12)
  assert.equal(grid[0].length, 31)
  // Jan 1 has two completions
  assert.equal(grid[0][0].key, '2026-01-01')
  assert.equal(grid[0][0].count, 2)
  // Mar 15
  assert.equal(grid[2][14].key, '2026-03-15')
  assert.equal(grid[2][14].count, 1)
  // Feb (index 1) day 30 & 31 don't exist -> null (2026 is not a leap year, 28 days)
  assert.equal(grid[1][27].key, '2026-02-28')
  assert.equal(grid[1][28].key, null)
  assert.equal(grid[1][30].key, null)
  // Apr (index 3) has 30 days -> day 31 null
  assert.equal(grid[3][30].key, null)
  assert.equal(grid[3][29].key, '2026-04-30')
})

test('buildYearGrid honors leap year February', () => {
  const grid = buildYearGrid({}, 2024) // leap year
  assert.equal(grid[1][28].key, '2024-02-29') // Feb 29 exists
  assert.equal(grid[1][29].key, null) // Feb 30 doesn't
})

test('yearsWithData returns sorted unique years that have completions', () => {
  const log: DailyLog = {
    '2024-12-31': ['h1'],
    '2025-06-01': ['h1'],
    '2026-01-01': ['h1'],
    '2025-09-09': [], // empty -> ignored
  }
  assert.deepEqual(yearsWithData(log), [2024, 2025, 2026])
})
