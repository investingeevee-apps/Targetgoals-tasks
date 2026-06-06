import { useMemo } from 'react'
import { useStore } from '../store'
import { computeGoalProgress, computeStats, computeStreaks } from '@targetgoals/shared'
import { formatLongDate } from '@targetgoals/shared'
import { buildDailyLog } from '../lib/transform'
import { Heatmap } from './Heatmap'

function GoalsOverview() {
  const goals = useStore((s) => s.goals)
  const tasks = useStore((s) => s.tasks)
  const dailyTasks = useStore((s) => s.dailyTasks)
  const completions = useStore((s) => s.dailyCompletions)
  const selectGoal = useStore((s) => s.selectGoal)

  const active = useMemo(
    () =>
      goals
        .filter((g) => !g.deleted && g.status !== 'archived')
        .sort(
          (a, b) =>
            (a.status === 'achieved' ? 1 : 0) - (b.status === 'achieved' ? 1 : 0) || a.order - b.order,
        ),
    [goals],
  )
  if (active.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Goals</h2>
        <button className="text-xs text-accent hover:underline" onClick={() => selectGoal(null)}>
          View all
        </button>
      </div>
      <div className="space-y-3">
        {active.map((g) => {
          const milestones = tasks.filter((t) => t.goalId === g.id && !t.deleted)
          const habits = dailyTasks.filter((d) => d.goalId === g.id && !d.deleted && !d.archived)
          const p = computeGoalProgress(g, milestones, habits, completions)
          return (
            <button
              key={g.id}
              onClick={() => selectGoal(g.id)}
              className="block w-full text-left transition-opacity hover:opacity-90"
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="truncate text-slate-200">{g.title}</span>
                <span className="ml-2 shrink-0 text-xs font-semibold text-slate-400">
                  {p.percent}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${p.percent}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3.5">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

export function OverviewScreen() {
  const completions = useStore((s) => s.dailyCompletions)
  const dailyTasks = useStore((s) => s.dailyTasks)

  const dailyLog = useMemo(() => buildDailyLog(completions), [completions])
  const stats = useMemo(() => computeStats(dailyLog), [dailyLog])
  const streaks = useMemo(
    () => computeStreaks(dailyTasks, completions),
    [dailyTasks, completions],
  )
  const activeHabits = dailyTasks.filter((d) => !d.deleted && !d.archived).length

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-slate-400">
          Your daily-task completion history, all stored locally.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total completed"
          value={String(stats.totalCompletions)}
          hint="daily tasks all-time"
        />
        <StatCard
          label="Active days"
          value={String(stats.activeDays)}
          hint={stats.firstDay ? `since ${formatLongDate(stats.firstDay)}` : 'none yet'}
        />
        <StatCard
          label="Current streak"
          value={`${streaks.currentStreak}d`}
          hint={streaks.currentStreak > 0 ? 'all habits, daily' : 'finish today'}
        />
        <StatCard
          label="Longest streak"
          value={`${streaks.longestStreak}d`}
          hint="personal best"
        />
        <StatCard label="Tracked habits" value={String(activeHabits)} hint="active daily tasks" />
        <StatCard
          label="Best day"
          value={stats.bestDay ? String(stats.bestDay.count) : '0'}
          hint={stats.bestDay ? formatLongDate(stats.bestDay.date) : 'no data'}
        />
        <StatCard
          label="Daily average"
          value={
            stats.activeDays
              ? (stats.totalCompletions / stats.activeDays).toFixed(1)
              : '0'
          }
          hint="per active day"
        />
        <StatCard
          label="Completion"
          value={
            activeHabits && stats.activeDays
              ? `${Math.min(
                  100,
                  Math.round(
                    (stats.totalCompletions /
                      (stats.activeDays * activeHabits)) *
                      100,
                  ),
                )}%`
              : '0%'
          }
          hint="of habits on active days"
        />
      </div>

      <GoalsOverview />

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Completion activity
          </h2>
          <span className="text-xs text-slate-500">last 18 weeks</span>
        </div>
        <Heatmap log={dailyLog} />
      </div>
    </div>
  )
}
