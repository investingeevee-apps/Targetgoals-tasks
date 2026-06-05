import { useStore } from '../store'
import type { TaskDTO } from '@targetgoals/shared'
import { addDays, fromKey, todayKey } from '@targetgoals/shared'

type Freq = 'off' | 'daily' | 'weekly' | 'monthly'
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Schedule a task into Today: a one-time "Plan for" date, or a repeat rule. */
export function ScheduleControls({ task }: { task: TaskDTO }) {
  const scheduleTask = useStore((s) => s.scheduleTask)
  const setTaskRecurrence = useStore((s) => s.setTaskRecurrence)

  const rule = task.recurrence ?? null
  const freq: Freq = rule?.freq ?? 'off'
  const today = todayKey()

  function setFreq(f: Freq) {
    if (f === 'off') {
      setTaskRecurrence(task.id, null)
      return
    }
    // turning on a repeat clears any one-time date so they don't both apply
    if (task.scheduledDate) scheduleTask(task.id, null)
    if (f === 'daily') setTaskRecurrence(task.id, { freq: 'daily' })
    else if (f === 'weekly')
      setTaskRecurrence(task.id, {
        freq: 'weekly',
        weekdays: rule?.weekdays?.length ? rule.weekdays : [fromKey(today).getDay()],
      })
    else setTaskRecurrence(task.id, { freq: 'monthly', monthday: rule?.monthday ?? fromKey(today).getDate() })
  }

  function toggleWeekday(d: number) {
    const cur = new Set(rule?.weekdays ?? [])
    if (cur.has(d)) cur.delete(d)
    else cur.add(d)
    const weekdays = [...cur].sort((a, b) => a - b)
    setTaskRecurrence(task.id, { freq: 'weekly', weekdays: weekdays.length ? weekdays : [fromKey(today).getDay()] })
  }

  const repeatChips: { key: Freq; label: string }[] = [
    { key: 'off', label: 'One-time' },
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ]
  const dateChips: { label: string; value: string | null }[] = [
    { label: 'None', value: null },
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
  ]

  const chip = (active: boolean) =>
    `rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
      active ? 'bg-accent text-white' : 'border border-slate-800 text-slate-300 hover:bg-slate-800/60'
    }`

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">Add to Today</label>

      <div className="flex flex-wrap gap-1.5">
        {repeatChips.map((r) => (
          <button key={r.key} className={chip(freq === r.key)} onClick={() => setFreq(r.key)}>
            {r.label}
          </button>
        ))}
      </div>

      {freq === 'off' && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {dateChips.map((d) => (
            <button
              key={d.label}
              className={chip((task.scheduledDate ?? null) === d.value)}
              onClick={() => scheduleTask(task.id, d.value)}
            >
              {d.label}
            </button>
          ))}
          <input
            type="date"
            value={task.scheduledDate ?? ''}
            onChange={(e) => scheduleTask(task.id, e.target.value || null)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-accent"
          />
        </div>
      )}

      {freq === 'weekly' && (
        <div className="mt-2 flex gap-1">
          {WEEKDAYS.map((w, i) => {
            const on = (rule?.weekdays ?? []).includes(i)
            return (
              <button
                key={i}
                className={`h-7 w-7 rounded-full text-xs font-semibold transition-colors ${
                  on ? 'bg-accent text-white' : 'border border-slate-800 text-slate-400 hover:bg-slate-800/60'
                }`}
                onClick={() => toggleWeekday(i)}
                title={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
              >
                {w}
              </button>
            )
          })}
        </div>
      )}

      {freq === 'monthly' && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span>On day</span>
          <input
            type="number"
            min={1}
            max={31}
            value={rule?.monthday ?? 1}
            onChange={(e) => {
              const n = Math.min(31, Math.max(1, Number(e.target.value) || 1))
              setTaskRecurrence(task.id, { freq: 'monthly', monthday: n })
            }}
            className="w-16 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-accent"
          />
          <span>of each month</span>
        </div>
      )}
    </div>
  )
}
