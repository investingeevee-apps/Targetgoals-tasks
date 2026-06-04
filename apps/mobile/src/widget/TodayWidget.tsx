import { FlexWidget, TextWidget } from 'react-native-android-widget'

export interface WidgetData {
  streak: number
  done: number
  total: number
  tasks: { title: string; done: boolean }[]
}

/**
 * Read-only home-screen widget: streak + today's progress + today's habit list.
 * Tapping anywhere opens the app. Rendered with react-native-android-widget's
 * own primitives (not regular React Native components).
 */
export function TodayWidget({ streak, done, total, tasks }: WidgetData) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0f172a',
        borderRadius: 16,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TextWidget text="Daily" style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }} />
        <TextWidget
          text={`🔥 ${streak}d`}
          style={{ fontSize: 13, fontWeight: '700', color: '#E37D1E' }}
        />
      </FlexWidget>

      <TextWidget
        text={total > 0 ? `${done} of ${total} done today` : 'No habits yet'}
        style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}
      />

      {tasks.map((t, i) => (
        <FlexWidget
          key={i}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 7, width: 'match_parent' }}
        >
          <TextWidget
            text={t.done ? '✓' : '○'}
            style={{ fontSize: 13, color: t.done ? '#1E84E3' : '#64748b', marginRight: 8 }}
          />
          <TextWidget
            text={t.title}
            maxLines={1}
            style={{ fontSize: 13, color: t.done ? '#64748b' : '#e2e8f0' }}
          />
        </FlexWidget>
      ))}
    </FlexWidget>
  )
}
