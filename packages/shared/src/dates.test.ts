import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addDays,
  dayDiff,
  formatDue,
  fromKey,
  isOverdue,
  toKey,
  todayKey,
} from './dates'

test('toKey / fromKey round-trip', () => {
  const k = '2026-06-03'
  assert.equal(toKey(fromKey(k)), k)
})

test('addDays handles month rollover', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01')
  assert.equal(addDays('2026-02-28', 1), '2026-03-01') // 2026 not a leap year
  assert.equal(addDays('2024-02-28', 1), '2024-02-29') // 2024 is a leap year
})

test('addDays handles year rollover (both directions)', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-01-01', -1), '2025-12-31')
})

test('dayDiff counts whole local days', () => {
  assert.equal(dayDiff('2026-06-03', '2026-06-02'), 1)
  assert.equal(dayDiff('2026-06-02', '2026-06-03'), -1)
  assert.equal(dayDiff('2026-06-05', '2026-06-03'), 2)
  assert.equal(dayDiff('2026-06-03', '2026-06-03'), 0)
  // across a month boundary
  assert.equal(dayDiff('2026-03-01', '2026-02-28'), 1)
})

test('isOverdue is strictly before today', () => {
  assert.equal(isOverdue(addDays(todayKey(), -1)), true)
  assert.equal(isOverdue(todayKey()), false)
  assert.equal(isOverdue(addDays(todayKey(), 1)), false)
})

test('formatDue relative labels', () => {
  assert.equal(formatDue(todayKey()), 'Today')
  assert.equal(formatDue(addDays(todayKey(), 1)), 'Tomorrow')
  assert.equal(formatDue(addDays(todayKey(), -1)), 'Yesterday')
})
