import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { ScheduledCompletionDTO, TaskDTO } from './sync'
import { addDays, todayKey } from './dates'
import { todayAgenda } from './agenda'

const task = (over: Partial<TaskDTO>): TaskDTO => ({
  id: 't', listId: 'L', title: 't', notes: '', due: null, starred: false,
  completed: false, completedAt: null, createdAt: 'x', subtasks: [], order: 0,
  goalId: null, scheduledDate: null, recurrence: null, updatedAt: 1, deleted: false, ...over,
})
const today = todayKey()

test('one-time task scheduled today appears', () => {
  const items = todayAgenda([task({ id: 'a', scheduledDate: today })], [], today)
  assert.equal(items.length, 1)
  assert.equal(items[0].repeating, false)
  assert.equal(items[0].overdue, false)
})

test('one-time task scheduled in the future does NOT appear', () => {
  const items = todayAgenda([task({ id: 'a', scheduledDate: addDays(today, 2) })], [], today)
  assert.equal(items.length, 0)
})

test('overdue one-time task carries over and is marked overdue', () => {
  const items = todayAgenda([task({ id: 'a', scheduledDate: addDays(today, -3) })], [], today)
  assert.equal(items.length, 1)
  assert.equal(items[0].overdue, true)
})

test('completed one-time task drops off Today', () => {
  const items = todayAgenda([task({ id: 'a', scheduledDate: today, completed: true })], [], today)
  assert.equal(items.length, 0)
})

test('repeating task appears on matching day with done from occurrence completion', () => {
  const dow = new Date().getDay()
  const t = task({ id: 'r', recurrence: { freq: 'weekly', weekdays: [dow] } })
  const none = todayAgenda([t], [], today)
  assert.equal(none.length, 1)
  assert.equal(none[0].repeating, true)
  assert.equal(none[0].done, false)

  const comp: ScheduledCompletionDTO = {
    id: 'c', taskId: 'r', dateKey: today, createdAt: 'x', updatedAt: 1, deleted: false,
  }
  const done = todayAgenda([t], [comp], today)
  assert.equal(done[0].done, true)
})

test('repeating task does not appear on a non-matching day', () => {
  const dow = new Date().getDay()
  const t = task({ id: 'r', recurrence: { freq: 'weekly', weekdays: [(dow + 1) % 7] } })
  assert.equal(todayAgenda([t], [], today).length, 0)
})

test('overdue sorts before on-time', () => {
  const items = todayAgenda(
    [task({ id: 'ontime', scheduledDate: today }), task({ id: 'late', scheduledDate: addDays(today, -1) })],
    [],
    today,
  )
  assert.equal(items[0].task.id, 'late')
})
