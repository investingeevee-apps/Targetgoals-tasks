import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { GoalDTO, GoalProgressMode, Pace } from '@targetgoals/shared'
import {
  computeGoalProgress,
  computeStreaks,
  daysUntil,
  paceStatus,
  projectedFinish,
  todayKey,
} from '@targetgoals/shared'
import { CheckCircle, Circle, Flame, Plus, Star, Trash } from './Icons'

/** Circular progress ring. */
function ProgressRing({ percent, size = 64, stroke = 6 }: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (percent / 100) * c
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-slate-800" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        className="text-accent transition-all duration-500"
      />
    </svg>
  )
}

const PACE: Record<Pace, { label: string; cls: string }> = {
  ahead: { label: 'Ahead of pace', cls: 'bg-emerald-500/15 text-emerald-400' },
  onTrack: { label: 'On track', cls: 'bg-accent/15 text-accent' },
  behind: { label: 'Behind', cls: 'bg-rose-500/15 text-rose-400' },
  noDeadline: { label: 'No deadline', cls: 'bg-slate-700/40 text-slate-400' },
  done: { label: 'Complete', cls: 'bg-emerald-500/15 text-emerald-400' },
}

/** Compute a goal's milestones, habits, progress, pace, streak, projection. */
function useGoalStats(goal: GoalDTO) {
  const tasks = useStore((s) => s.tasks)
  const dailyTasks = useStore((s) => s.dailyTasks)
  const completions = useStore((s) => s.dailyCompletions)
  return useMemo(() => {
    const milestones = tasks
      .filter((t) => t.goalId === goal.id && !t.deleted)
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
    const habits = dailyTasks.filter((d) => d.goalId === goal.id && !d.deleted && !d.archived)
    const progress = computeGoalProgress(goal, milestones, habits, completions)
    const pace = paceStatus(goal, progress.percent)
    const habitIds = new Set(habits.map((h) => h.id))
    const goalCompletions = completions.filter((c) => habitIds.has(c.dailyTaskId))
    const streak = habits.length ? computeStreaks(habits, goalCompletions).currentStreak : 0
    return { milestones, habits, progress, pace, streak, projected: projectedFinish(goal) }
  }, [goal, tasks, dailyTasks, completions])
}

function countdown(targetDate: string | null): string | null {
  const d = daysUntil(targetDate)
  if (d == null) return null
  if (d === 0) return 'Due today'
  if (d < 0) return `${-d}d overdue`
  return `${d}d left`
}

function GoalCard({ goal, onOpen }: { goal: GoalDTO; onOpen: () => void }) {
  const { progress, pace, streak } = useGoalStats(goal)
  const cd = countdown(goal.targetDate)
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left transition-colors hover:border-slate-700"
    >
      <div className="relative grid place-items-center">
        <ProgressRing percent={progress.percent} />
        <span className="absolute text-sm font-bold text-slate-100">{progress.percent}%</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-slate-100">{goal.title}</div>
        <div className="mt-0.5 text-xs text-slate-500">{progress.label}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PACE[pace].cls}`}>
            {PACE[pace].label}
          </span>
          {cd && <span className="text-[11px] text-slate-500">{cd}</span>}
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-flame">
              <Flame width={11} height={11} />
              {streak}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

const MODES: { key: GoalProgressMode; label: string; hint: string }[] = [
  { key: 'milestones', label: 'Steps', hint: 'Break it into milestones' },
  { key: 'metric', label: 'A number', hint: 'e.g. 24 books, 100 miles' },
  { key: 'habits', label: 'Daily habits', hint: 'Consistency over time' },
]

function CreateGoalForm({ onDone, onCancel }: { onDone: (id: string) => void; onCancel: () => void }) {
  const addGoal = useStore((s) => s.addGoal)
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [mode, setMode] = useState<GoalProgressMode>('milestones')
  const [targetDate, setTargetDate] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [unit, setUnit] = useState('')

  function create() {
    if (!title.trim()) return
    const id = addGoal({
      title,
      why,
      targetDate: targetDate || null,
      progressMode: mode,
      targetValue: mode === 'metric' ? Number(targetValue) || null : null,
      unit: mode === 'metric' ? unit || null : null,
    })
    onDone(id)
  }

  const field = 'w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent'

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="mb-3 text-lg font-bold text-white">New goal</h2>
      <input
        autoFocus
        className={`${field} mb-2`}
        placeholder="What do you want to achieve?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && create()}
      />
      <input
        className={`${field} mb-3`}
        placeholder="Why does it matter? (optional)"
        value={why}
        onChange={(e) => setWhy(e.target.value)}
      />

      <label className="mb-1 block text-xs font-medium text-slate-500">Measure progress by</label>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`rounded-lg border p-2 text-left text-xs transition-colors ${
              mode === m.key ? 'border-accent bg-accent/10' : 'border-slate-800 hover:bg-slate-800/50'
            }`}
          >
            <div className="font-semibold text-slate-100">{m.label}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{m.hint}</div>
          </button>
        ))}
      </div>

      {mode === 'metric' && (
        <div className="mb-3 flex gap-2">
          <input
            className={field}
            type="number"
            placeholder="Target (e.g. 24)"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
          <input
            className={field}
            placeholder="Unit (e.g. books)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
      )}

      <label className="mb-1 block text-xs font-medium text-slate-500">Target date (optional)</label>
      <input
        className={`${field} mb-4`}
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          onClick={create}
          disabled={!title.trim()}
          className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          Create &amp; break it down
        </button>
        <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800">
          Cancel
        </button>
      </div>
    </div>
  )
}

function GoalDetail({ goal, onBack }: { goal: GoalDTO; onBack: () => void }) {
  const { milestones, habits, progress, pace, streak, projected } = useGoalStats(goal)
  const lists = useStore((s) => s.lists)
  const allHabits = useStore((s) => s.dailyTasks)
  const completions = useStore((s) => s.dailyCompletions)
  const addMilestone = useStore((s) => s.addMilestone)
  const toggleTask = useStore((s) => s.toggleTask)
  const addDailyTask = useStore((s) => s.addDailyTask)
  const linkHabitToGoal = useStore((s) => s.linkHabitToGoal)
  const toggleDailyToday = useStore((s) => s.toggleDailyToday)
  const setGoalProgress = useStore((s) => s.setGoalProgress)
  const achieveGoal = useStore((s) => s.achieveGoal)
  const archiveGoal = useStore((s) => s.archiveGoal)
  const reopenGoal = useStore((s) => s.reopenGoal)
  const deleteGoal = useStore((s) => s.deleteGoal)

  const [msDraft, setMsDraft] = useState('')
  const [habitDraft, setHabitDraft] = useState('')
  const [progressDraft, setProgressDraft] = useState('')

  const todayStr = todayKey()
  const doneToday = useMemo(() => {
    const s = new Set<string>()
    for (const c of completions) if (!c.deleted && c.dateKey === todayStr) s.add(c.dailyTaskId)
    return s
  }, [completions, todayStr])

  const listId = lists.find((l) => !l.deleted)?.id ?? ''
  const unlinkedHabits = allHabits.filter((h) => !h.deleted && !h.archived && !h.goalId)

  function addMs() {
    if (msDraft.trim() && listId) {
      addMilestone(goal.id, listId, msDraft)
      setMsDraft('')
    }
  }
  function addHabit() {
    if (!habitDraft.trim()) return
    const id = addDailyTask(habitDraft)
    if (id) linkHabitToGoal(id, goal.id)
    setHabitDraft('')
  }

  const cd = countdown(goal.targetDate)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto px-6 py-8">
      <button onClick={onBack} className="mb-4 self-start text-sm text-slate-400 hover:text-slate-200">
        ← All goals
      </button>

      {/* header */}
      <div className="flex items-center gap-5">
        <div className="relative grid place-items-center">
          <ProgressRing percent={progress.percent} size={84} stroke={7} />
          <span className="absolute text-lg font-bold text-slate-100">{progress.percent}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-white">{goal.title}</h1>
          {goal.why && <p className="mt-0.5 text-sm text-slate-400">{goal.why}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${PACE[pace].cls}`}>{PACE[pace].label}</span>
            {cd && <span className="text-slate-500">{cd}</span>}
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-flame">
                <Flame width={12} height={12} />
                {streak} day streak
              </span>
            )}
            <span className="text-slate-500">{progress.label}</span>
          </div>
        </div>
      </div>

      {goal.status === 'achieved' && (
        <div className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
          🎉 Goal achieved!
        </div>
      )}

      {/* metric update */}
      {goal.progressMode === 'metric' && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Progress</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-28 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
              placeholder={`${goal.currentValue ?? 0}`}
              value={progressDraft}
              onChange={(e) => setProgressDraft(e.target.value)}
            />
            <span className="text-sm text-slate-500">/ {goal.targetValue} {goal.unit}</span>
            <button
              onClick={() => {
                const v = Number(progressDraft)
                if (!Number.isNaN(v)) setGoalProgress(goal.id, v)
                setProgressDraft('')
              }}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Update
            </button>
            {projected && <span className="text-xs text-slate-500">≈ finish {projected}</span>}
          </div>
        </section>
      )}

      {/* milestones */}
      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Milestones {milestones.length > 0 && `(${milestones.filter((m) => m.completed).length}/${milestones.length})`}
        </h2>
        <div className="space-y-0.5">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
              <button
                className={m.completed ? 'text-accent' : 'text-slate-500 hover:text-slate-300'}
                onClick={() => toggleTask(m.id)}
              >
                {m.completed ? <CheckCircle width={18} height={18} /> : <Circle width={18} height={18} />}
              </button>
              <span className={`text-sm ${m.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                {m.title}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 focus-within:border-accent">
          <Plus width={14} height={14} className="text-accent" />
          <input
            value={msDraft}
            onChange={(e) => setMsDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMs()}
            placeholder="Add a step"
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>
      </section>

      {/* linked habits */}
      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Daily habits</h2>
        <div className="space-y-0.5">
          {habits.map((h) => {
            const done = doneToday.has(h.id)
            return (
              <div key={h.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                <button
                  className={done ? 'text-accent' : 'text-slate-500 hover:text-slate-300'}
                  onClick={() => toggleDailyToday(h.id)}
                >
                  {done ? <CheckCircle width={18} height={18} /> : <Circle width={18} height={18} />}
                </button>
                <span className={`text-sm ${done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                  {h.title}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 focus-within:border-accent">
          <Plus width={14} height={14} className="text-accent" />
          <input
            value={habitDraft}
            onChange={(e) => setHabitDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            placeholder="Add a daily habit for this goal"
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>
        {unlinkedHabits.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-600">Link existing:</span>
            {unlinkedHabits.slice(0, 6).map((h) => (
              <button
                key={h.id}
                onClick={() => linkHabitToGoal(h.id, goal.id)}
                className="rounded-full border border-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800/60"
              >
                + {h.title}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* actions */}
      <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-800 pt-5">
        {goal.status === 'active' ? (
          <button
            onClick={() => achieveGoal(goal.id)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/25"
          >
            <Star width={16} height={16} /> Mark achieved
          </button>
        ) : (
          <button
            onClick={() => reopenGoal(goal.id)}
            className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
          >
            Reopen
          </button>
        )}
        {goal.status !== 'archived' && (
          <button
            onClick={() => archiveGoal(goal.id)}
            className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
          >
            Archive
          </button>
        )}
        <button
          onClick={() => {
            if (confirm(`Delete goal "${goal.title}"? Milestones and habits are kept (just unlinked).`)) {
              deleteGoal(goal.id)
              onBack()
            }
          }}
          className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10"
        >
          <Trash width={16} height={16} /> Delete
        </button>
      </div>
    </div>
  )
}

export function GoalsScreen() {
  const goals = useStore((s) => s.goals)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const visible = useMemo(
    () =>
      goals
        .filter((g) => !g.deleted && g.status !== 'archived')
        .sort(
          (a, b) =>
            (a.status === 'achieved' ? 1 : 0) - (b.status === 'achieved' ? 1 : 0) ||
            a.order - b.order ||
            a.createdAt.localeCompare(b.createdAt),
        ),
    [goals],
  )
  const selected = selectedId ? goals.find((g) => g.id === selectedId && !g.deleted) : null

  if (selected) return <GoalDetail goal={selected} onBack={() => setSelectedId(null)} />

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Goals</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            <Plus width={16} height={16} /> New goal
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-5">
          <CreateGoalForm
            onDone={(id) => {
              setCreating(false)
              if (id) setSelectedId(id)
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {visible.length === 0 && !creating ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-slate-500">No goals yet.</p>
          <p className="mt-1 text-sm text-slate-600">
            Set a goal, then break it into daily tasks and habits to reach it.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            <Plus width={16} height={16} /> Create your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((g) => (
            <GoalCard key={g.id} goal={g} onOpen={() => setSelectedId(g.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
