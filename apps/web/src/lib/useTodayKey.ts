import { useEffect, useState } from 'react'
import { todayKey } from '@targetgoals/shared'

/**
 * Like `todayKey()`, but re-renders the component when the local day rolls over
 * (or when the tab regains focus) so a screen left open past midnight updates its
 * date, progress, and "today" set instead of showing yesterday.
 */
export function useTodayKey(): string {
  const [key, setKey] = useState(todayKey())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const scheduleMidnight = () => {
      const now = new Date()
      // 1s past the next local midnight, to be safely on the new day
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      timer = setTimeout(() => {
        setKey(todayKey()) // no-op re-render if unchanged; React bails on equal state
        scheduleMidnight()
      }, next.getTime() - now.getTime())
    }

    const onFocus = () => setKey(todayKey())

    scheduleMidnight()
    window.addEventListener('focus', onFocus)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return key
}
