import { AppState, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { computeStreaks, todayKey } from '@targetgoals/shared'
import { buildDailyLog } from '../lib/transform'
import { useStore } from '../store'
import { useNotifPrefs } from './store'

const CHANNEL = 'reminders'

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const req = await Notifications.requestPermissionsAsync()
  return req.granted
}

function todayAt(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0)
}

let busy = false
let pending = false

/**
 * Cancel and re-schedule local notifications from the current habit state.
 * Because we reschedule on every habit change + on app foreground, the daily
 * reminder is skipped once today is complete, and the streak-at-risk warning is
 * only scheduled while a streak is genuinely on the line.
 */
export async function syncNotifications(): Promise<void> {
  // If a run is in progress, remember that state changed and re-run once it
  // finishes — so rapid habit toggles don't drop the final reschedule.
  if (busy) {
    pending = true
    return
  }
  busy = true
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()

    const prefs = useNotifPrefs.getState()
    if (!prefs.enabled) return
    if (!(await ensurePermission())) return

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    const s = useStore.getState()
    const active = s.dailyTasks.filter((d) => !d.deleted && !d.archived)
    const total = active.length
    if (total === 0) return

    const doneToday = new Set(buildDailyLog(s.dailyCompletions)[todayKey()] ?? [])
    const doneCount = active.filter((d) => doneToday.has(d.id)).length
    const allDone = doneCount === total

    // Daily reminder — next occurrence (today if still ahead & not done, else tomorrow).
    if (prefs.dailyReminder) {
      let when = todayAt(prefs.dailyTime)
      const now = new Date()
      // The notification body is frozen at schedule time but read at fire time, so a
      // live "X of N done today" count is only valid if it fires on the SAME day. When
      // we push it to tomorrow (the typical morning reminder, scheduled the night
      // before), today's count would be stale by morning — show a fresh prompt instead.
      let firesToday = true
      if (allDone || when <= now) {
        when = new Date(when.getTime() + 86_400_000)
        firesToday = false
      }
      const taskWord = total === 1 ? 'task' : 'tasks'
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Log your daily tasks',
          body: firesToday
            ? `${doneCount} of ${total} done today`
            : `You have ${total} ${taskWord} to complete today`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
      })
    }

    // Streak-at-risk — only today, only while a streak exists and isn't yet secured.
    if (prefs.streakRisk && !allDone) {
      const streak = computeStreaks(s.dailyTasks, s.dailyCompletions).currentStreak
      const when = todayAt(prefs.streakTime)
      if (streak > 0 && when > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔥 Keep your streak alive!',
            body: `Finish today's habits to protect your ${streak}-day streak.`,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
        })
      }
    }
  } catch {
    // notifications can be limited in Expo Go; ignore failures
  } finally {
    busy = false
    if (pending) {
      pending = false
      void syncNotifications()
    }
  }
}

let started = false

export function initNotifications(): void {
  if (started) return
  started = true

  // Set the foreground handler here (not at import time) so it only runs once the
  // app has decided notifications are safe to initialize in this environment.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })

  void syncNotifications()

  let prevDaily = useStore.getState().dailyTasks
  let prevCompletions = useStore.getState().dailyCompletions
  useStore.subscribe((state) => {
    if (state.dailyTasks !== prevDaily || state.dailyCompletions !== prevCompletions) {
      prevDaily = state.dailyTasks
      prevCompletions = state.dailyCompletions
      void syncNotifications()
    }
  })

  useNotifPrefs.subscribe(() => void syncNotifications())

  AppState.addEventListener('change', (s) => {
    if (s === 'active') void syncNotifications()
  })
}
