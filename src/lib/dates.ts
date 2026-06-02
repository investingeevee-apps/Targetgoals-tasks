/**
 * All date math here is in the user's LOCAL timezone so the "daily reset"
 * happens at the user's midnight, not UTC.
 */

/** Format a Date as a local 'YYYY-MM-DD' key. */
export function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Today's local date key. */
export function todayKey(): string {
  return toKey(new Date())
}

/** Parse a 'YYYY-MM-DD' key back into a local Date (at local midnight). */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Return a new date key offset by `n` days from the given key. */
export function addDays(key: string, n: number): string {
  const date = fromKey(key)
  date.setDate(date.getDate() + n)
  return toKey(date)
}

/** Whole-day difference: a - b, in days. */
export function dayDiff(aKey: string, bKey: string): number {
  const ms = fromKey(aKey).getTime() - fromKey(bKey).getTime()
  return Math.round(ms / 86_400_000)
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Human-friendly due date: "Today", "Tomorrow", "Yesterday", or "Mon, Jun 3". */
export function formatDue(key: string): string {
  const diff = dayDiff(key, todayKey())
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  const d = fromKey(key)
  const base = `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
  return base
}

/** True if the key is strictly before today. */
export function isOverdue(key: string): boolean {
  return dayDiff(key, todayKey()) < 0
}

/** Long form for headers: "Tuesday, June 2". */
const WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export function formatLongDate(key: string): string {
  const d = fromKey(key)
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`
}
