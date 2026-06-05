import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromKey } from './dates'
import { occursOn, recurrenceLabel } from './recurs'

test('null/undefined recurrence never occurs', () => {
  assert.equal(occursOn(null, '2026-06-15'), false)
  assert.equal(occursOn(undefined, '2026-06-15'), false)
})

test('daily occurs every day', () => {
  assert.equal(occursOn({ freq: 'daily' }, '2026-06-15'), true)
  assert.equal(occursOn({ freq: 'daily' }, '2027-01-01'), true)
})

test('weekly occurs only on its weekdays', () => {
  const key = '2026-06-15'
  const dow = fromKey(key).getDay()
  assert.equal(occursOn({ freq: 'weekly', weekdays: [dow] }, key), true)
  assert.equal(occursOn({ freq: 'weekly', weekdays: [(dow + 1) % 7] }, key), false)
  assert.equal(occursOn({ freq: 'weekly', weekdays: [] }, key), false)
})

test('monthly occurs on its day-of-month, clamped to month length', () => {
  assert.equal(occursOn({ freq: 'monthly', monthday: 15 }, '2026-06-15'), true)
  assert.equal(occursOn({ freq: 'monthly', monthday: 14 }, '2026-06-15'), false)
  // 2026 is not a leap year → Feb has 28 days; "31st" clamps to the 28th
  assert.equal(occursOn({ freq: 'monthly', monthday: 31 }, '2026-02-28'), true)
  assert.equal(occursOn({ freq: 'monthly', monthday: 31 }, '2026-02-27'), false)
})

test('recurrenceLabel formats each frequency', () => {
  assert.equal(recurrenceLabel(null), '')
  assert.equal(recurrenceLabel({ freq: 'daily' }), 'Every day')
  assert.equal(recurrenceLabel({ freq: 'weekly', weekdays: [1, 3, 5] }), 'Mon, Wed, Fri')
  assert.equal(recurrenceLabel({ freq: 'weekly', weekdays: [0, 1, 2, 3, 4, 5, 6] }), 'Every day')
  assert.equal(recurrenceLabel({ freq: 'monthly', monthday: 1 }), 'Monthly on the 1st')
  assert.equal(recurrenceLabel({ freq: 'monthly', monthday: 22 }), 'Monthly on the 22nd')
})
