import { useMemo } from 'react'
import type { DailyLog } from '../types'
import { buildHeatmap, intensity } from '../lib/stats'
import { formatLongDate, todayKey } from '../lib/dates'

const LEVELS = [
  'bg-slate-800/70',
  'bg-accent/30',
  'bg-accent/50',
  'bg-accent/75',
  'bg-accent',
]

const DOW_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

export function Heatmap({ log, weeks = 18 }: { log: DailyLog; weeks?: number }) {
  const columns = useMemo(() => buildHeatmap(log, weeks), [log, weeks])
  const max = useMemo(() => {
    let m = 0
    for (const k of Object.keys(log)) m = Math.max(m, log[k].length)
    return m
  }, [log])
  const today = todayKey()

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2">
        {/* weekday labels */}
        <div className="flex flex-col gap-1 pr-1 pt-0.5 text-[10px] text-slate-500">
          {DOW_LABELS.map((d, i) => (
            <div key={i} className="h-3.5 leading-[14px]">
              {d}
            </div>
          ))}
        </div>

        {/* week columns */}
        <div className="flex gap-1">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((day) => {
                const future = day.key > today
                const lvl = intensity(day.count, max)
                return (
                  <div
                    key={day.key}
                    title={
                      future
                        ? ''
                        : `${day.count} completed · ${formatLongDate(day.key)}`
                    }
                    className={`h-3.5 w-3.5 rounded-sm ${
                      future ? 'bg-transparent' : LEVELS[lvl]
                    }`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-slate-500">
        <span>Less</span>
        {LEVELS.map((c, i) => (
          <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
