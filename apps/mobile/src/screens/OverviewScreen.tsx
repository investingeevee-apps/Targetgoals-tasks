import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { buildHeatmap, computeStats, formatLongDate, intensity } from '@targetgoals/shared'
import { useStore } from '../store'
import { buildDailyLog } from '../lib/transform'
import { colors, heatLevels } from '../theme'

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
    </View>
  )
}

export function OverviewScreen() {
  const completions = useStore((s) => s.dailyCompletions)
  const dailyTasks = useStore((s) => s.dailyTasks)

  const dailyLog = useMemo(() => buildDailyLog(completions), [completions])
  const stats = useMemo(() => computeStats(dailyLog), [dailyLog])
  const columns = useMemo(() => buildHeatmap(dailyLog, 16), [dailyLog])
  const max = useMemo(() => {
    let m = 0
    for (const k of Object.keys(dailyLog)) m = Math.max(m, dailyLog[k].length)
    return m
  }, [dailyLog])
  const activeHabits = dailyTasks.filter((d) => !d.deleted && !d.archived).length
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Overview</Text>
      <Text style={styles.subtle}>Your daily-task completion history.</Text>

      <View style={styles.grid}>
        <StatCard label="Total completed" value={String(stats.totalCompletions)} hint="all-time" />
        <StatCard
          label="Active days"
          value={String(stats.activeDays)}
          hint={stats.firstDay ? `since ${formatLongDate(stats.firstDay)}` : 'none yet'}
        />
        <StatCard label="Current streak" value={`${stats.currentStreak}d`} />
        <StatCard label="Longest streak" value={`${stats.longestStreak}d`} hint="personal best" />
        <StatCard label="Tracked habits" value={String(activeHabits)} />
        <StatCard
          label="Best day"
          value={stats.bestDay ? String(stats.bestDay.count) : '0'}
          hint={stats.bestDay ? formatLongDate(stats.bestDay.date) : undefined}
        />
      </View>

      <View style={styles.heatCard}>
        <Text style={styles.heatTitle}>Completion activity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.heatGrid}>
            {columns.map((col, ci) => (
              <View key={ci} style={styles.heatCol}>
                {col.map((day) => {
                  const future = day.key > todayStr
                  const lvl = intensity(day.count, max)
                  return (
                    <View
                      key={day.key}
                      style={[
                        styles.heatCell,
                        { backgroundColor: future ? 'transparent' : heatLevels[lvl] },
                      ]}
                    />
                  )
                })}
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.legendRow}>
          <Text style={styles.legendText}>Less</Text>
          {heatLevels.map((c, i) => (
            <View key={i} style={[styles.heatCell, { backgroundColor: c }]} />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtle: { color: colors.textDim, fontSize: 13, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%', flexGrow: 1, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, borderRadius: 12, padding: 12,
  },
  cardLabel: { color: colors.textFaint, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  cardValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  cardHint: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  heatCard: {
    marginTop: 18, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
  },
  heatTitle: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 12 },
  heatGrid: { flexDirection: 'row', gap: 4 },
  heatCol: { gap: 4 },
  heatCell: { width: 13, height: 13, borderRadius: 3 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 12 },
  legendText: { color: colors.textFaint, fontSize: 10 },
})
