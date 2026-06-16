import { useMemo, useState } from 'react'
import type { DailyLog } from '@targetgoals/shared'
import { buildYearGrid, formatLongDate, intensity, todayKey, yearsWithData } from '@targetgoals/shared'

const LEVELS = [
  'bg-slate-800/70',
  'bg-accent/30',
  'bg-accent/50',
  'bg-accent/75',
  'bg-accent',
]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = new Set([1, 5, 10, 15, 20, 25, 31])

/**
 * Year "habit board": 12 month-columns × 31 day-rows. Each lit cell is a day with
 * completions (intensity by count); blanks are days that don't exist in a month.
 */
export function YearCalendar({ log }: { log: DailyLog }) {
  const today = todayKey()
  const currentYear = Number(today.slice(0, 4))
  const dataYears = useMemo(() => yearsWithData(log), [log])
  const minYear = Math.min(currentYear, dataYears[0] ?? currentYear)
  const maxYear = Math.max(currentYear, dataYears[dataYears.length - 1] ?? currentYear)
  const [year, setYear] = useState(currentYear)

  const grid = useMemo(() => buildYearGrid(log, year), [log, year])
  const max = useMemo(() => {
    let m = 0
    for (const k of Object.keys(log)) m = Math.max(m, log[k].length)
    return m
  }, [log])

  const navBtn =
    'grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-3">
        <button className={navBtn} disabled={year <= minYear} onClick={() => setYear((y) => Math.max(minYear, y - 1))} title="Previous year">
          ‹
        </button>
        <span className="w-12 text-center text-sm font-semibold text-slate-200">{year}</span>
        <button className={navBtn} disabled={year >= maxYear} onClick={() => setYear((y) => Math.min(maxYear, y + 1))} title="Next year">
          ›
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-[3px]">
          {/* day-number gutter */}
          <div className="flex flex-col items-end gap-[3px] pr-1">
            <div className="h-4" />
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <div key={d} className="h-3 w-4 text-right text-[9px] leading-3 text-slate-600">
                {DAY_LABELS.has(d) ? d : ''}
              </div>
            ))}
          </div>

          {/* month columns */}
          {grid.map((cells, mi) => (
            <div key={mi} className="flex flex-col items-center gap-[3px]">
              <div className="h-4 text-[10px] leading-4 text-slate-500">{MONTHS[mi]}</div>
              {cells.map((cell, di) => {
                if (cell.key === null) return <div key={di} className="h-3 w-3" />
                const future = cell.key > today
                const lvl = intensity(cell.count, max)
                return (
                  <div
                    key={cell.key}
                    title={future ? '' : `${cell.count} completed · ${formatLongDate(cell.key)}`}
                    className={`h-3 w-3 rounded-[3px] ${future ? 'bg-transparent' : LEVELS[lvl]}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-slate-500">
        <span>Less</span>
        {LEVELS.map((c, i) => (
          <div key={i} className={`h-3 w-3 rounded-[3px] ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
