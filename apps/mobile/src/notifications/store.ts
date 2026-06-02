import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface NotifPrefs {
  enabled: boolean // master switch
  dailyReminder: boolean
  dailyTime: string // 'HH:MM' (24h)
  streakRisk: boolean
  streakTime: string // 'HH:MM' (24h)

  setEnabled: (v: boolean) => void
  setDailyReminder: (v: boolean) => void
  setDailyTime: (t: string) => void
  setStreakRisk: (v: boolean) => void
  setStreakTime: (t: string) => void
}

export const useNotifPrefs = create<NotifPrefs>()(
  persist(
    (set) => ({
      enabled: true,
      dailyReminder: true,
      dailyTime: '09:00',
      streakRisk: true,
      streakTime: '20:00',

      setEnabled: (enabled) => set({ enabled }),
      setDailyReminder: (dailyReminder) => set({ dailyReminder }),
      setDailyTime: (dailyTime) => set({ dailyTime }),
      setStreakRisk: (streakRisk) => set({ streakRisk }),
      setStreakTime: (streakTime) => set({ streakTime }),
    }),
    {
      name: 'targetgoals-notif-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

/** Shift an 'HH:MM' time by `deltaMinutes`, wrapping within a day. */
export function shiftTime(hhmm: string, deltaMinutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440
  const hh = String(Math.floor(total / 60)).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

/** Format 'HH:MM' (24h) as a friendly 12-hour string. */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ap = h < 12 ? 'AM' : 'PM'
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}
