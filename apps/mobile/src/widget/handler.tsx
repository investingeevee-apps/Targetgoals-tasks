import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget'
import { computeStreaks, todayKey } from '@targetgoals/shared'
import type { DailyCompletionDTO, DailyTaskDTO } from '@targetgoals/shared'
import { buildDailyLog } from '../lib/transform'
import { TodayWidget, type WidgetData } from './TodayWidget'

const WIDGET_NAME = 'TargetGoalsDaily'
const EMPTY: WidgetData = { streak: 0, done: 0, total: 0, tasks: [] }

/** Read today's habit data straight from the persisted store (AsyncStorage). */
async function readWidgetData(): Promise<WidgetData> {
  try {
    const raw = await AsyncStorage.getItem('targetgoals-mobile-v1')
    if (!raw) return EMPTY
    const state = JSON.parse(raw).state as {
      dailyTasks?: DailyTaskDTO[]
      dailyCompletions?: DailyCompletionDTO[]
    }
    const completions = state.dailyCompletions ?? []
    const dailyTasks = (state.dailyTasks ?? []).filter((d) => !d.deleted && !d.archived)
    const log = buildDailyLog(completions)
    const doneToday = new Set(log[todayKey()] ?? [])
    return {
      streak: computeStreaks(dailyTasks, completions).currentStreak,
      done: dailyTasks.filter((d) => doneToday.has(d.id)).length,
      total: dailyTasks.length,
      tasks: dailyTasks.slice(0, 6).map((d) => ({ title: d.title, done: doneToday.has(d.id) })),
    }
  } catch {
    return EMPTY
  }
}

/** Invoked by Android (headless) when the widget is added/updated/resized. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await readWidgetData()
      props.renderWidget(<TodayWidget {...data} />)
      break
    }
    default:
      break
  }
}

/**
 * Ask Android to re-render the widget now. Guarded so it safely no-ops in Expo Go
 * or anywhere the native widget module isn't present.
 */
export async function updateDailyWidget(): Promise<void> {
  try {
    const data = await readWidgetData()
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <TodayWidget {...data} />,
      widgetNotFound: () => {},
    })
  } catch {
    // native widget not available (Expo Go) — ignore
  }
}
