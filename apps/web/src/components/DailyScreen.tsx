import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { computeStreaks, formatLongDate, recurrenceLabel, todayAgenda } from '@targetgoals/shared'
import { buildDailyLog } from '../lib/transform'
import { useTodayKey } from '../lib/useTodayKey'
import { CheckCircle, Circle, Flame, Pencil, Plus, Repeat, Trash } from './Icons'
import { GripHandle, SortableList, SortableRow } from './Sortable'
import { GoalChip } from './GoalChip'

export function DailyScreen() {
  const allDailyTasks = useStore((s) => s.dailyTasks)
  const completions = useStore((s) => s.dailyCompletions)
  const addDailyTask = useStore((s) => s.addDailyTask)
  const deleteDailyTask = useStore((s) => s.deleteDailyTask)
  const renameDailyTask = useStore((s) => s.renameDailyTask)
  const toggleDailyToday = useStore((s) => s.toggleDailyToday)
  const reorderDailyTasks = useStore((s) => s.reorderDailyTasks)

  const allTasks = useStore((s) => s.tasks)
  const scheduledCompletions = useStore((s) => s.scheduledCompletions)
  const lists = useStore((s) => s.lists)
  const toggleScheduledToday = useStore((s) => s.toggleScheduledToday)
  const scheduleTask = useStore((s) => s.scheduleTask)
  const selectTask = useStore((s) => s.selectTask)
  const selectList = useStore((s) => s.selectList)

  /** Jump from a scheduled item to its task (Tasks screen, detail open). */
  function openTask(listId: string, taskId: string) {
    selectList(listId)
    selectTask(taskId)
  }

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const key = useTodayKey()
  const dailyLog = useMemo(() => buildDailyLog(completions), [completions])
  const doneToday = useMemo(() => new Set(dailyLog[key] ?? []), [dailyLog, key])
  const active = useMemo(
    () =>
      allDailyTasks
        .filter((d) => !d.deleted && !d.archived)
        .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)),
    [allDailyTasks],
  )
  const completedCount = active.filter((d) => doneToday.has(d.id)).length
  const pct = active.length ? Math.round((completedCount / active.length) * 100) : 0
  const streaks = useMemo(
    () => computeStreaks(allDailyTasks, completions),
    [allDailyTasks, completions],
  )

  const agenda = useMemo(
    () => todayAgenda(allTasks, scheduledCompletions, key),
    [allTasks, scheduledCompletions, key],
  )
  const listName = useMemo(() => {
    const m = new Map(lists.map((l) => [l.id, l.name]))
    return (id: string) => m.get(id) ?? 'Tasks'
  }, [lists])

  function submit() {
    addDailyTask(draft)
    setDraft('')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Today</h1>
            <p className="text-sm text-slate-400">{formatLongDate(key)}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-flame/10 px-3 py-1.5 text-sm font-semibold text-flame">
            <Flame width={16} height={16} />
            {streaks.currentStreak} day streak
          </div>
        </div>

        {/* Habit progress bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>Today's habits</span>
            <span>
              {completedCount} of {active.length} done
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* ---- Scheduled for today ---- */}
        {agenda.length > 0 && (
          <section>
            <h2 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Scheduled for today
            </h2>
            <div className="space-y-0.5">
              {agenda.map(({ task, repeating, overdue, done }) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-2.5 hover:bg-slate-800/50"
                >
                  <button
                    className={`shrink-0 transition-colors ${
                      done ? 'text-accent' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    onClick={() => toggleScheduledToday(task.id, key)}
                    title={done ? 'Mark not done' : 'Mark done'}
                  >
                    {done ? <CheckCircle /> : <Circle />}
                  </button>

                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => openTask(task.listId, task.id)}
                  >
                    <span
                      className={`block truncate text-sm ${
                        done ? 'text-slate-500 line-through' : 'text-slate-100'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs">
                      {overdue && <span className="font-medium text-rose-400">Overdue</span>}
                      {repeating ? (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Repeat width={12} height={12} />
                          {recurrenceLabel(task.recurrence)}
                        </span>
                      ) : null}
                      <span className="truncate text-slate-600">{listName(task.listId)}</span>
                    </span>
                  </button>

                  {!repeating && (
                    <button
                      className="shrink-0 text-slate-600 opacity-0 transition hover:text-slate-300 group-hover:opacity-100"
                      onClick={() => scheduleTask(task.id, null)}
                      title="Remove from Today"
                    >
                      <Trash width={15} height={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Habits ---- */}
        <section>
          <h2 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Habits
          </h2>

          <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 focus-within:border-accent">
            <Plus width={18} height={18} className="text-accent" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Add a recurring daily habit (e.g. Meditate)"
              className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>

          {active.length === 0 && (
            <div className="mt-8 text-center text-sm text-slate-500">
              No habits yet. Add things you want to do every day.
            </div>
          )}

          <SortableList ids={active.map((d) => d.id)} onReorder={reorderDailyTasks}>
            {active.map((d) => {
              const done = doneToday.has(d.id)
              return (
                <SortableRow key={d.id} id={d.id}>
                  {(handle) => (
                    <div className="group flex items-center gap-2 rounded-lg px-2 py-2.5 hover:bg-slate-800/50">
                      <GripHandle handle={handle} />
                      <button
                        className={`shrink-0 transition-colors ${
                          done ? 'text-accent' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        onClick={() => toggleDailyToday(d.id)}
                      >
                        {done ? <CheckCircle /> : <Circle />}
                      </button>

                      {editingId === d.id ? (
                        <input
                          autoFocus
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onBlur={() => {
                            renameDailyTask(d.id, editDraft)
                            setEditingId(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameDailyTask(d.id, editDraft)
                              setEditingId(null)
                            }
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-accent"
                        />
                      ) : (
                        <div className="min-w-0 flex-1">
                          <button
                            className="block text-left"
                            onClick={() => {
                              setEditDraft(d.title)
                              setEditingId(d.id)
                            }}
                            title="Click to rename"
                          >
                            <span
                              className={`text-sm ${done ? 'text-slate-500 line-through' : 'text-slate-100'}`}
                            >
                              {d.title}
                            </span>
                          </button>
                          {d.goalId && (
                            <div className="mt-0.5">
                              <GoalChip goalId={d.goalId} />
                            </div>
                          )}
                        </div>
                      )}

                      {editingId !== d.id && (
                        <button
                          className="shrink-0 text-slate-600 opacity-0 transition hover:text-accent group-hover:opacity-100"
                          onClick={() => {
                            setEditDraft(d.title)
                            setEditingId(d.id)
                          }}
                          title="Rename"
                        >
                          <Pencil width={15} height={15} />
                        </button>
                      )}

                      <button
                        className="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                        onClick={() => {
                          if (confirm(`Delete "${d.title}" and its history?`)) deleteDailyTask(d.id)
                        }}
                        title="Delete"
                      >
                        <Trash width={16} height={16} />
                      </button>
                    </div>
                  )}
                </SortableRow>
              )
            })}
          </SortableList>
        </section>
      </div>

      <p className="mt-4 border-t border-slate-800 pt-3 text-center text-xs text-slate-500">
        Habits reset every day · scheduled tasks come from your lists
      </p>
    </div>
  )
}
