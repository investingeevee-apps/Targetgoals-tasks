import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { DailyCompletionDTO, DailyTaskDTO, GoalDTO, TaskDTO } from './sync'
import { addDays, todayKey } from './dates'
import { computeGoalProgress, paceStatus, projectedFinish } from './goals'

const baseGoal = (over: Partial<GoalDTO>): GoalDTO => ({
  id: 'g1',
  title: 'Goal',
  why: '',
  targetDate: null,
  progressMode: 'milestones',
  targetValue: null,
  unit: null,
  currentValue: null,
  progressLog: [],
  status: 'active',
  createdAt: `${addDays(todayKey(), -10)}T12:00:00.000Z`,
  order: 0,
  updatedAt: 1,
  deleted: false,
  ...over,
})

const task = (over: Partial<TaskDTO>): TaskDTO => ({
  id: 't', listId: 'L', title: 't', notes: '', due: null, starred: false,
  completed: false, completedAt: null, createdAt: 'x', subtasks: [], order: 0,
  goalId: 'g1', scheduledDate: null, recurrence: null, updatedAt: 1, deleted: false, ...over,
})

test('milestones progress = completed / total', () => {
  const ms = [task({ id: 'a', completed: true }), task({ id: 'b' }), task({ id: 'c' })]
  const p = computeGoalProgress(baseGoal({ progressMode: 'milestones' }), ms, [], [])
  assert.equal(p.percent, 33)
  assert.equal(p.label, '1 / 3 steps')
})

test('metric progress = current / target', () => {
  const g = baseGoal({ progressMode: 'metric', targetValue: 24, currentValue: 12, unit: 'books' })
  const p = computeGoalProgress(g, [], [], [])
  assert.equal(p.percent, 50)
  assert.equal(p.label, '12 / 24 books')
})

test('habit consistency over the window', () => {
  const h: DailyTaskDTO = { id: 'h1', title: 'Run', archived: false, createdAt: 'x', order: 0, goalId: 'g1', updatedAt: 1, deleted: false }
  const comp = (n: number): DailyCompletionDTO => ({
    id: `c${n}`, dailyTaskId: 'h1', dateKey: addDays(todayKey(), -n), createdAt: 'x', updatedAt: 1, deleted: false,
  })
  // 5 of the last 10 days done, 1 habit, window 10 → 50%
  const comps = [0, 1, 2, 3, 4].map(comp)
  const p = computeGoalProgress(baseGoal({ progressMode: 'habits' }), [], [h], comps, 10)
  assert.equal(p.percent, 50)
})

test('achieved goal is 100%', () => {
  const p = computeGoalProgress(baseGoal({ status: 'achieved' }), [], [], [])
  assert.equal(p.percent, 100)
})

test('paceStatus: ahead / onTrack / behind vs elapsed time', () => {
  // created 10 days ago, due in 10 days → 50% of time elapsed
  const g = baseGoal({ targetDate: addDays(todayKey(), 10) })
  assert.equal(paceStatus(g, 50), 'onTrack')
  assert.equal(paceStatus(g, 80), 'ahead')
  assert.equal(paceStatus(g, 20), 'behind')
  assert.equal(paceStatus(baseGoal({ targetDate: null }), 40), 'noDeadline')
  assert.equal(paceStatus(g, 100), 'done')
})

test('projectedFinish extrapolates a metric goal from its log', () => {
  // gained 10 over 10 days = 1/day; 40 remaining → ~40 days out
  const g = baseGoal({
    progressMode: 'metric', targetValue: 50, currentValue: 10,
    progressLog: [
      { dateKey: addDays(todayKey(), -10), value: 0 },
      { dateKey: todayKey(), value: 10 },
    ],
  })
  assert.equal(projectedFinish(g), addDays(todayKey(), 40))
  // not enough data
  assert.equal(projectedFinish(baseGoal({ progressMode: 'metric', targetValue: 50, currentValue: 10 })), null)
  // non-metric
  assert.equal(projectedFinish(baseGoal({ progressMode: 'milestones' })), null)
})
