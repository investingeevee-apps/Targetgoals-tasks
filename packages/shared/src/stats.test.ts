import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { DailyCompletionDTO } from './sync'
import type { DailyLog } from './types'
import { addDays, todayKey } from './dates'
import { buildHeatmap, computeStats, computeStreaks, intensity } from './stats'

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
