import type { Recurrence } from './sync'
import { fromKey } from './dates'

/** Does a repeating schedule fall on the given local date key (YYYY-MM-DD)? */
export function occursOn(rule: Recurrence | null | undefined, dateKey: string): boolean {
  if (!rule) return false
  switch (rule.freq) {
    case 'daily':
      return true
    case 'weekly': {
      const days = rule.weekdays
      if (!days || days.length === 0) return false
      return days.includes(fromKey(dateKey).getDay())
    }
    case 'monthly': {
      if (rule.monthday == null) return false
      const d = fromKey(dateKey)
      // Clamp to the month's length so e.g. "31st" fires on the last day of short months.
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      return d.getDate() === Math.min(rule.monthday, lastDay)
    }
    default:
      return false
  }
}

const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

/** Short human label, e.g. "Every day", "Mon, Wed, Fri", "Monthly on the 1st". */
export function recurrenceLabel(rule: Recurrence | null | undefined): string {
  if (!rule) return ''
  if (rule.freq === 'daily') return 'Every day'
  if (rule.freq === 'weekly') {
    const days = (rule.weekdays ?? []).slice().sort((a, b) => a - b)
    if (days.length === 0) return 'Weekly'
    if (days.length === 7) return 'Every day'
    return days.map((d) => WEEKDAY_ABBR[d]).join(', ')
  }
  if (rule.freq === 'monthly') {
    const d = rule.monthday ?? 1
    return `Monthly on the ${d}${ordinal(d)}`
  }
  return ''
}
