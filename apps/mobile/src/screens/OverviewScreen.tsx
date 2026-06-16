import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  buildMonthGrid,
  buildWeekGrid,
  buildYearGrid,
  computeGoalProgress,
  computeStats,
  computeStreaks,
  formatLongDate,
  intensity,
  yearsWithData,
} from '@targetgoals/shared'
import { useStore } from '../store'
import { buildDailyLog } from '../lib/transform'
import { colors, heatLevels } from '../theme'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const GUTTER_DAYS = new Set([1, 5, 10, 15, 20, 25, 31])
const shortDate = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${Number(key.slice(8))}`

/** A numbered, heat-shaded day cell (week + month views). */
function NumCell({ cell, todayStr, max, size }: { cell: { key: string | null; count: number }; todayStr: string; max: number; size: number }) {
  if (!cell.key) return <View style={{ width: size, height: size, margin: 2 }} />
  const future = cell.key > todayStr
  const lvl = intensity(cell.count, max)
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: 7, margin: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: future ? 'transparent' : heatLevels[lvl] },
        cell.key === todayStr ? { borderWidth: 1.5, borderColor: colors.accent } : null,
      ]}
    >
      <Text style={{ color: future ? colors.textFaint : lvl >= 3 ? '#fff' : colors.text, fontSize: 11 }}>
        {Number(cell.key.slice(8))}
      </Text>
    </View>
  )
}

function GoalsOverview() {
  const goals = useStore((s) => s.goals)
  const tasks = useStore((s) => s.tasks)
  const dailyTasks = useStore((s) => s.dailyTasks)
  const completions = useStore((s) => s.dailyCompletions)
  const selectGoal = useStore((s) => s.selectGoal)

  const active = useMemo(
    () =>
      goals
        .filter((g) => !g.deleted && g.status !== 'archived')
        .sort(
          (a, b) =>
            (a.status === 'achieved' ? 1 : 0) - (b.status === 'achieved' ? 1 : 0) || a.order - b.order,
        ),
    [goals],
  )
  if (active.length === 0) return null

  return (
    <View style={styles.goalsCard}>
      <Text style={styles.heatTitle}>Goals</Text>
      {active.map((g) => {
        const milestones = tasks.filter((t) => t.goalId === g.id && !t.deleted)
        const habits = dailyTasks.filter((d) => d.goalId === g.id && !d.deleted && !d.archived)
        const p = computeGoalProgress(g, milestones, habits, completions)
        return (
          <Pressable key={g.id} style={styles.goalRow} onPress={() => selectGoal(g.id)}>
            <View style={styles.goalRowTop}>
              <Text style={styles.goalRowTitle} numberOfLines={1}>
                {g.title}
              </Text>
              <Text style={styles.goalRowPct}>{p.percent}%</Text>
            </View>
            <View style={styles.goalBarTrack}>
              <View style={[styles.goalBarFill, { width: `${p.percent}%` }]} />
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

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
  const streaks = useMemo(
    () => computeStreaks(dailyTasks, completions),
    [dailyTasks, completions],
  )
  const max = useMemo(() => {
    let m = 0
    for (const k of Object.keys(dailyLog)) m = Math.max(m, dailyLog[k].length)
    return m
  }, [dailyLog])
  const activeHabits = dailyTasks.filter((d) => !d.deleted && !d.archived).length
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const currentYear = today.getFullYear()
  const dataYears = useMemo(() => yearsWithData(dailyLog), [dailyLog])
  const minYear = Math.min(currentYear, dataYears[0] ?? currentYear)
  const maxYear = Math.max(currentYear, dataYears[dataYears.length - 1] ?? currentYear)
  const [year, setYear] = useState(currentYear)
  const yearGrid = useMemo(() => buildYearGrid(dailyLog, year), [dailyLog, year])

  const [view, setView] = useState<'week' | 'month' | 'year'>('year')
  const weekCells = useMemo(() => buildWeekGrid(dailyLog, todayStr), [dailyLog, todayStr])
  const monthM = today.getMonth()
  const monthWeeks = useMemo(() => buildMonthGrid(dailyLog, currentYear, monthM), [dailyLog, currentYear, monthM])

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
        <StatCard label="Current streak" value={`${streaks.currentStreak}d`} />
        <StatCard label="Longest streak" value={`${streaks.longestStreak}d`} hint="personal best" />
        <StatCard label="Tracked habits" value={String(activeHabits)} />
        <StatCard
          label="Best day"
          value={stats.bestDay ? String(stats.bestDay.count) : '0'}
          hint={stats.bestDay ? formatLongDate(stats.bestDay.date) : undefined}
        />
      </View>

      <GoalsOverview />

      <View style={styles.heatCard}>
        <Text style={styles.heatTitle}>Completion activity</Text>

        <View style={styles.segment}>
          {(['week', 'month', 'year'] as const).map((v) => (
            <Pressable key={v} style={[styles.segmentBtn, view === v && styles.segmentBtnOn]} onPress={() => setView(v)}>
              <Text style={[styles.segmentText, view === v && styles.segmentTextOn]}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {view === 'week' && (
          <View>
            <Text style={styles.periodLabel}>
              This week · {shortDate(weekCells[0].key!)} – {shortDate(weekCells[6].key!)}
            </Text>
            <View style={styles.weekRow}>
              {weekCells.map((cell, i) => (
                <View key={cell.key} style={styles.weekCol}>
                  <Text style={styles.wdLabel}>{WD[i]}</Text>
                  <NumCell cell={cell} todayStr={todayStr} max={max} size={36} />
                </View>
              ))}
            </View>
          </View>
        )}

        {view === 'month' && (
          <View>
            <Text style={styles.periodLabel}>
              {MONTHS_LONG[monthM]} {currentYear}
            </Text>
            <View style={styles.monthWeekRow}>
              {WD.map((d, i) => (
                <Text key={i} style={styles.wdHeaderText}>{d}</Text>
              ))}
            </View>
            {monthWeeks.map((wk, wi) => (
              <View key={wi} style={styles.monthWeekRow}>
                {wk.map((cell, ci) => (
                  <NumCell key={cell.key ?? `p-${ci}`} cell={cell} todayStr={todayStr} max={max} size={36} />
                ))}
              </View>
            ))}
          </View>
        )}

        {view === 'year' && (
        <>
        <View style={styles.yearNav}>
          <Pressable disabled={year <= minYear} onPress={() => setYear((y) => Math.max(minYear, y - 1))} hitSlop={10}>
            <Text style={[styles.navArrow, year <= minYear && styles.navArrowOff]}>‹</Text>
          </Pressable>
          <Text style={styles.yearLabel}>{year}</Text>
          <Pressable disabled={year >= maxYear} onPress={() => setYear((y) => Math.min(maxYear, y + 1))} hitSlop={10}>
            <Text style={[styles.navArrow, year >= maxYear && styles.navArrowOff]}>›</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.yearGridRow}>
            {/* day-number gutter */}
            <View style={styles.gutterCol}>
              <View style={styles.monthLabelSpacer} />
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <View key={d} style={styles.gutterRow}>
                  <Text style={styles.gutterText}>{GUTTER_DAYS.has(d) ? d : ''}</Text>
                </View>
              ))}
            </View>

            {/* month columns */}
            {yearGrid.map((cells, mi) => (
              <View key={mi} style={styles.monthCol}>
                <Text style={styles.monthLabel}>{MONTHS[mi]}</Text>
                {cells.map((cell, di) => {
                  if (cell.key === null) return <View key={di} style={styles.ycellEmpty} />
                  const future = cell.key > todayStr
                  const lvl = intensity(cell.count, max)
                  return (
                    <View
                      key={cell.key}
                      style={[styles.ycell, { backgroundColor: future ? 'transparent' : heatLevels[lvl] }]}
                    />
                  )
                })}
              </View>
            ))}
          </View>
        </ScrollView>
        </>
        )}

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
  goalsCard: {
    marginTop: 18, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
  },
  goalRow: { marginTop: 12 },
  goalRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalRowTitle: { color: colors.text, fontSize: 14, flex: 1, marginRight: 8 },
  goalRowPct: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  goalBarTrack: { height: 7, borderRadius: 999, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  goalBarFill: { height: 7, borderRadius: 999, backgroundColor: colors.accent },
  heatCard: {
    marginTop: 18, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
  },
  heatTitle: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 12 },
  heatCell: { width: 13, height: 13, borderRadius: 3 },
  segment: {
    flexDirection: 'row', alignSelf: 'center', borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 3, marginBottom: 14,
  },
  segmentBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  segmentBtnOn: { backgroundColor: colors.accent },
  segmentText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  segmentTextOn: { color: '#fff' },
  periodLabel: { color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  weekRow: { flexDirection: 'row', justifyContent: 'center' },
  weekCol: { alignItems: 'center' },
  wdLabel: { color: colors.textFaint, fontSize: 10, marginBottom: 4 },
  monthWeekRow: { flexDirection: 'row', justifyContent: 'center' },
  wdHeaderText: { color: colors.textFaint, fontSize: 10, width: 40, textAlign: 'center', marginBottom: 2 },
  yearNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 12 },
  navArrow: { color: colors.textDim, fontSize: 22, fontWeight: '700', paddingHorizontal: 8 },
  navArrowOff: { opacity: 0.3 },
  yearLabel: { color: colors.text, fontSize: 14, fontWeight: '700', minWidth: 48, textAlign: 'center' },
  yearGridRow: { flexDirection: 'row' },
  gutterCol: { alignItems: 'flex-end', marginRight: 4 },
  monthLabelSpacer: { height: 13, marginBottom: 3 },
  gutterRow: { height: 11, marginBottom: 3, justifyContent: 'center' },
  gutterText: { color: colors.textFaint, fontSize: 8, lineHeight: 11 },
  monthCol: { alignItems: 'center', marginRight: 3 },
  monthLabel: { color: colors.textFaint, fontSize: 9, height: 13, lineHeight: 13, marginBottom: 3 },
  ycell: { width: 11, height: 11, borderRadius: 3, marginBottom: 3 },
  ycellEmpty: { width: 11, height: 11, marginBottom: 3 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 12 },
  legendText: { color: colors.textFaint, fontSize: 10 },
})
