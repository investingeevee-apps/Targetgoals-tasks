import { useEffect, useMemo, useState } from 'react'
import type { DailyLog } from '@targetgoals/shared'
import {
  buildMonthGrid,
  buildWeekGrid,
  buildYearGrid,
  formatLongDate,
  intensity,
  todayKey,
  yearsWithData,
} from '@targetgoals/shared'

const LEVELS = ['bg-slate-800/70', 'bg-accent/30', 'bg-accent/50', 'bg-accent/75', 'bg-accent']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_LABELS = new Set([1, 5, 10, 15, 20, 25, 31])

type View = 'week' | 'month' | 'year'
interface ViewProps {
  log: DailyLog
  today: string
  max: number
}

const lvlText = (lvl: number) => (lvl >= 3 ? 'text-white' : 'text-slate-300')
const dayNum = (key: string) => Number(key.slice(8))
const shortDate = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${dayNum(key)}`

/** A numbered, heat-shaded day cell used in the week and month views. */
function DayCell({ cell, today, max, className }: { cell: { key: string | null; count: number }; today: string; max: number; className: string }) {
  if (cell.key === null) return <div className={className} />
  const key = cell.key
  const future = key > today
  const lvl = intensity(cell.count, max)
  return (
    <div
      title={future ? '' : `${cell.count} completed · ${formatLongDate(key)}`}
      className={`grid place-items-center rounded-md text-xs font-medium ${className} ${
        future ? 'bg-slate-800/30 text-slate-600' : `${LEVELS[lvl]} ${lvlText(lvl)}`
      } ${key === today ? 'ring-2 ring-accent/70' : ''}`}
    >
      {dayNum(key)}
    </div>
  )
}

function WeekView({ log, today, max }: ViewProps) {
  const week = useMemo(() => buildWeekGrid(log, today), [log, today])
  const range = `${shortDate(week[0].key!)} – ${shortDate(week[6].key!)}`
  return (
    <div>
      <div className="mb-3 text-center text-sm font-semibold text-slate-200">
        This week <span className="text-slate-500">· {range}</span>
      </div>
      <div className="flex justify-center gap-2">
        {week.map((cell, i) => (
          <div key={cell.key} className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-slate-500">{WD[i]}</span>
            <DayCell cell={cell} today={today} max={max} className="h-11 w-11" />
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthView({ log, today, max }: ViewProps) {
  const y = Number(today.slice(0, 4))
  const m = Number(today.slice(5, 7)) - 1
  const weeks = useMemo(() => buildMonthGrid(log, y, m), [log, y, m])
  return (
    <div>
      <div className="mb-3 text-center text-sm font-semibold text-slate-200">
        {MONTHS_LONG[m]} {y}
      </div>
      <div className="mx-auto max-w-sm">
        <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[10px] text-slate-500">
          {WD.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weeks.flat().map((cell, i) => (
            <DayCell key={cell.key ?? `pad-${i}`} cell={cell} today={today} max={max} className="aspect-square" />
          ))}
        </div>
      </div>
    </div>
  )
}

function YearView({ log, today, max }: ViewProps) {
  const currentYear = Number(today.slice(0, 4))
  const dataYears = useMemo(() => yearsWithData(log), [log])
  const minYear = Math.min(currentYear, dataYears[0] ?? currentYear)
  const maxYear = Math.max(currentYear, dataYears[dataYears.length - 1] ?? currentYear)
  const [year, setYear] = useState(currentYear)
  // Follow the calendar if it rolls into a new year while this view stays mounted.
  useEffect(() => setYear(currentYear), [currentYear])
  const grid = useMemo(() => buildYearGrid(log, year), [log, year])

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
          <div className="flex flex-col items-end gap-[3px] pr-1">
            <div className="h-4" />
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <div key={d} className="h-3 w-4 text-right text-[9px] leading-3 text-slate-600">
                {DAY_LABELS.has(d) ? d : ''}
              </div>
            ))}
          </div>
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
    </div>
  )
}

/** Completion activity with a Week / Month / Year filter. */
export function ActivityCalendar({ log }: { log: DailyLog }) {
  const today = todayKey()
  const [view, setView] = useState<View>('year')
  const max = useMemo(() => {
    let m = 0
    for (const k of Object.keys(log)) m = Math.max(m, log[k].length)
    return m
  }, [log])

  return (
    <div>
      <div className="mb-4 flex justify-center">
        <div className="inline-flex rounded-lg border border-slate-800 p-0.5 text-xs">
          {(['week', 'month', 'year'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                view === v ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'week' && <WeekView log={log} today={today} max={max} />}
      {view === 'month' && <MonthView log={log} today={today} max={max} />}
      {view === 'year' && <YearView log={log} today={today} max={max} />}

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
