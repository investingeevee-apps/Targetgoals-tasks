import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { GoalDTO, GoalProgressMode, Pace } from '@targetgoals/shared'
import {
  computeGoalProgress,
  computeStreaks,
  daysUntil,
  paceStatus,
  projectedFinish,
  todayKey,
} from '@targetgoals/shared'
import { useStore } from '../store'
import { colors } from '../theme'

function Bar({ percent }: { percent: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${percent}%` }]} />
    </View>
  )
}

const PACE: Record<Pace, { label: string; color: string; bg: string }> = {
  ahead: { label: 'Ahead', color: colors.green, bg: 'rgba(16,185,129,0.15)' },
  onTrack: { label: 'On track', color: colors.accent, bg: 'rgba(30,132,227,0.15)' },
  behind: { label: 'Behind', color: colors.rose, bg: 'rgba(239,68,68,0.15)' },
  noDeadline: { label: 'No deadline', color: colors.textDim, bg: colors.surfaceAlt },
  done: { label: 'Complete', color: colors.green, bg: 'rgba(16,185,129,0.15)' },
}

function countdown(targetDate: string | null): string | null {
  const d = daysUntil(targetDate)
  if (d == null) return null
  if (d === 0) return 'Due today'
  if (d < 0) return `${-d}d overdue`
  return `${d}d left`
}

function useGoalStats(goal: GoalDTO) {
  const tasks = useStore((s) => s.tasks)
  const dailyTasks = useStore((s) => s.dailyTasks)
  const completions = useStore((s) => s.dailyCompletions)
  return useMemo(() => {
    const milestones = tasks
      .filter((t) => t.goalId === goal.id && !t.deleted)
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
    const habits = dailyTasks.filter((d) => d.goalId === goal.id && !d.deleted && !d.archived)
    const progress = computeGoalProgress(goal, milestones, habits, completions)
    const pace = paceStatus(goal, progress.percent)
    const habitIds = new Set(habits.map((h) => h.id))
    const goalCompletions = completions.filter((c) => habitIds.has(c.dailyTaskId))
    const streak = habits.length ? computeStreaks(habits, goalCompletions).currentStreak : 0
    return { milestones, habits, progress, pace, streak, projected: projectedFinish(goal) }
  }, [goal, tasks, dailyTasks, completions])
}

function PaceChip({ pace }: { pace: Pace }) {
  const p = PACE[pace]
  return (
    <View style={[styles.chipPill, { backgroundColor: p.bg }]}>
      <Text style={[styles.chipPillText, { color: p.color }]}>{p.label}</Text>
    </View>
  )
}

function GoalCard({ goal, onOpen }: { goal: GoalDTO; onOpen: () => void }) {
  const { progress, pace, streak } = useGoalStats(goal)
  const cd = countdown(goal.targetDate)
  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {goal.title}
        </Text>
        <Text style={styles.cardPct}>{progress.percent}%</Text>
      </View>
      <Bar percent={progress.percent} />
      <View style={styles.cardMeta}>
        <PaceChip pace={pace} />
        {cd && <Text style={styles.metaText}>{cd}</Text>}
        {streak > 0 && <Text style={styles.streakText}>🔥 {streak}</Text>}
        <Text style={styles.metaText}>· {progress.label}</Text>
      </View>
    </Pressable>
  )
}

const MODES: { key: GoalProgressMode; label: string }[] = [
  { key: 'milestones', label: 'Steps' },
  { key: 'metric', label: 'A number' },
  { key: 'habits', label: 'Habits' },
]

function CreateGoalForm({ onDone, onCancel }: { onDone: (id: string) => void; onCancel: () => void }) {
  const addGoal = useStore((s) => s.addGoal)
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [mode, setMode] = useState<GoalProgressMode>('milestones')
  const [targetDate, setTargetDate] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [unit, setUnit] = useState('')

  function create() {
    if (!title.trim()) return
    const id = addGoal({
      title,
      why,
      targetDate: targetDate || null,
      progressMode: mode,
      targetValue: mode === 'metric' && targetValue.trim() !== '' ? Number(targetValue) : null,
      unit: mode === 'metric' ? unit || null : null,
    })
    onDone(id)
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>New goal</Text>
      <TextInput
        style={styles.input}
        placeholder="What do you want to achieve?"
        placeholderTextColor={colors.textFaint}
        value={title}
        onChangeText={setTitle}
        autoFocus
      />
      <TextInput
        style={styles.input}
        placeholder="Why does it matter? (optional)"
        placeholderTextColor={colors.textFaint}
        value={why}
        onChangeText={setWhy}
      />
      <Text style={styles.label}>Measure progress by</Text>
      <View style={styles.modeRow}>
        {MODES.map((m) => {
          const on = mode === m.key
          return (
            <Pressable key={m.key} style={[styles.modeChip, on && styles.modeChipOn]} onPress={() => setMode(m.key)}>
              <Text style={[styles.modeChipText, on && styles.modeChipTextOn]}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>
      {mode === 'metric' && (
        <View style={styles.metricRow}>
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="Target (e.g. 24)"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            value={targetValue}
            onChangeText={setTargetValue}
          />
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="Unit (e.g. books)"
            placeholderTextColor={colors.textFaint}
            value={unit}
            onChangeText={setUnit}
          />
        </View>
      )}
      <Text style={styles.label}>Target date (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        value={targetDate}
        onChangeText={setTargetDate}
      />
      <View style={styles.formBtns}>
        <Pressable style={[styles.primaryBtn, styles.flex1, !title.trim() && styles.disabled]} disabled={!title.trim()} onPress={create}>
          <Text style={styles.primaryBtnText}>Create &amp; break it down</Text>
        </Pressable>
        <Pressable style={styles.ghostBtn} onPress={onCancel}>
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  )
}

function EditableRow({
  title,
  done,
  editing,
  onToggle,
  onStartEdit,
  onCommitEdit,
  onDelete,
  onUnlink,
}: {
  title: string
  done: boolean
  editing: boolean
  onToggle: () => void
  onStartEdit: () => void
  onCommitEdit: (v: string) => void
  onDelete: () => void
  onUnlink?: () => void
}) {
  const [draft, setDraft] = useState(title)
  const committed = useRef(false)
  useEffect(() => {
    if (editing) {
      setDraft(title)
      committed.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])
  return (
    <View style={styles.itemRow}>
      <Pressable onPress={onToggle} hitSlop={8}>
        <View style={[styles.check, done && styles.checkDone]}>{done && <Text style={styles.checkMark}>✓</Text>}</View>
      </Pressable>
      {editing ? (
        <TextInput
          style={styles.editInput}
          value={draft}
          onChangeText={setDraft}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => {
            committed.current = true
            onCommitEdit(draft)
          }}
          onBlur={() => {
            if (!committed.current) onCommitEdit(draft)
            committed.current = false
          }}
        />
      ) : (
        <Pressable style={styles.flex1} onPress={onStartEdit}>
          <Text style={[styles.itemText, done && styles.itemTextDone]}>{title}</Text>
        </Pressable>
      )}
      {!editing && onUnlink && (
        <Pressable onPress={onUnlink} hitSlop={6}>
          <Text style={styles.unlink}>Unlink</Text>
        </Pressable>
      )}
      {!editing && (
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.trash}>🗑</Text>
        </Pressable>
      )}
    </View>
  )
}

function GoalDetail({ goal, onBack }: { goal: GoalDTO; onBack: () => void }) {
  const { milestones, habits, progress, pace, streak, projected } = useGoalStats(goal)
  const lists = useStore((s) => s.lists)
  const completions = useStore((s) => s.dailyCompletions)
  const addMilestone = useStore((s) => s.addMilestone)
  const toggleTask = useStore((s) => s.toggleTask)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const addDailyTask = useStore((s) => s.addDailyTask)
  const renameDailyTask = useStore((s) => s.renameDailyTask)
  const deleteDailyTask = useStore((s) => s.deleteDailyTask)
  const linkHabitToGoal = useStore((s) => s.linkHabitToGoal)
  const toggleDailyToday = useStore((s) => s.toggleDailyToday)
  const setGoalProgress = useStore((s) => s.setGoalProgress)
  const achieveGoal = useStore((s) => s.achieveGoal)
  const archiveGoal = useStore((s) => s.archiveGoal)
  const reopenGoal = useStore((s) => s.reopenGoal)
  const deleteGoal = useStore((s) => s.deleteGoal)

  const [msDraft, setMsDraft] = useState('')
  const [habitDraft, setHabitDraft] = useState('')
  const [progressDraft, setProgressDraft] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  const todayStr = todayKey()
  const doneToday = useMemo(() => {
    const s = new Set<string>()
    for (const c of completions) if (!c.deleted && c.dateKey === todayStr) s.add(c.dailyTaskId)
    return s
  }, [completions, todayStr])

  const listId = lists.find((l) => !l.deleted)?.id ?? ''
  const cd = countdown(goal.targetDate)

  function addMs() {
    if (msDraft.trim() && listId) {
      addMilestone(goal.id, listId, msDraft)
      setMsDraft('')
    }
  }
  function addHabit() {
    if (!habitDraft.trim()) return
    const id = addDailyTask(habitDraft)
    if (id) linkHabitToGoal(id, goal.id)
    setHabitDraft('')
  }
  function confirmDelete(label: string, fn: () => void) {
    Alert.alert('Delete', `Delete ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: fn },
    ])
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} hitSlop={8}>
        <Text style={styles.back}>← All goals</Text>
      </Pressable>

      <Text style={styles.h1}>{goal.title}</Text>
      {goal.why ? <Text style={styles.why}>{goal.why}</Text> : null}

      <View style={styles.detailPctRow}>
        <Text style={styles.bigPct}>{progress.percent}%</Text>
        <View style={styles.flex1}>
          <Bar percent={progress.percent} />
          <View style={styles.cardMeta}>
            <PaceChip pace={pace} />
            {cd && <Text style={styles.metaText}>{cd}</Text>}
            {streak > 0 && <Text style={styles.streakText}>🔥 {streak}</Text>}
          </View>
        </View>
      </View>
      <Text style={styles.progressLabel}>{progress.label}</Text>

      {goal.status === 'achieved' && (
        <View style={styles.achievedBanner}>
          <Text style={styles.achievedText}>🏆 Goal achieved!</Text>
        </View>
      )}

      {goal.progressMode === 'metric' && (
        <>
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.metricUpdate}>
            <TextInput
              style={styles.metricInput}
              keyboardType="number-pad"
              placeholder={`${goal.currentValue ?? 0}`}
              placeholderTextColor={colors.textFaint}
              value={progressDraft}
              onChangeText={setProgressDraft}
            />
            <Text style={styles.metaText}>
              / {goal.targetValue} {goal.unit}
            </Text>
            <Pressable
              style={styles.primaryBtnSm}
              onPress={() => {
                const v = Number(progressDraft)
                if (!Number.isNaN(v) && progressDraft !== '') setGoalProgress(goal.id, v)
                setProgressDraft('')
              }}
            >
              <Text style={styles.primaryBtnText}>Update</Text>
            </Pressable>
          </View>
          {projected ? <Text style={styles.projected}>≈ finish {projected}</Text> : null}
        </>
      )}

      <Text style={styles.sectionTitle}>
        Milestones{' '}
        {milestones.length > 0 ? `(${milestones.filter((m) => m.completed).length}/${milestones.length})` : ''}
      </Text>
      {milestones.map((m) => (
        <EditableRow
          key={m.id}
          title={m.title}
          done={m.completed}
          editing={editId === m.id}
          onToggle={() => toggleTask(m.id)}
          onStartEdit={() => setEditId(m.id)}
          onCommitEdit={(v) => {
            if (v.trim()) updateTask(m.id, { title: v })
            setEditId(null)
          }}
          onDelete={() => deleteTask(m.id)}
        />
      ))}
      <View style={styles.addRow}>
        <Text style={styles.addPlus}>＋</Text>
        <TextInput
          style={styles.addInput}
          value={msDraft}
          onChangeText={setMsDraft}
          placeholder="Add a step"
          placeholderTextColor={colors.textFaint}
          returnKeyType="done"
          onSubmitEditing={addMs}
        />
      </View>

      <Text style={styles.sectionTitle}>Daily habits</Text>
      {habits.map((h) => (
        <EditableRow
          key={h.id}
          title={h.title}
          done={doneToday.has(h.id)}
          editing={editId === h.id}
          onToggle={() => toggleDailyToday(h.id)}
          onStartEdit={() => setEditId(h.id)}
          onCommitEdit={(v) => {
            if (v.trim()) renameDailyTask(h.id, v)
            setEditId(null)
          }}
          onUnlink={() => linkHabitToGoal(h.id, null)}
          onDelete={() => confirmDelete(`habit "${h.title}" and its history`, () => deleteDailyTask(h.id))}
        />
      ))}
      <View style={styles.addRow}>
        <Text style={styles.addPlus}>＋</Text>
        <TextInput
          style={styles.addInput}
          value={habitDraft}
          onChangeText={setHabitDraft}
          placeholder="Add a daily habit for this goal"
          placeholderTextColor={colors.textFaint}
          returnKeyType="done"
          onSubmitEditing={addHabit}
        />
      </View>

      <View style={styles.actions}>
        {goal.status === 'active' ? (
          <Pressable style={styles.achieveBtn} onPress={() => achieveGoal(goal.id)}>
            <Text style={styles.achieveBtnText}>★ Mark achieved</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.ghostBtn} onPress={() => reopenGoal(goal.id)}>
            <Text style={styles.ghostBtnText}>Reopen</Text>
          </Pressable>
        )}
        {goal.status !== 'archived' && (
          <Pressable style={styles.ghostBtn} onPress={() => archiveGoal(goal.id)}>
            <Text style={styles.ghostBtnText}>Archive</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.deleteBtn}
          onPress={() => confirmDelete(`goal "${goal.title}"`, () => {
            deleteGoal(goal.id)
            onBack()
          })}
        >
          <Text style={styles.deleteText}>🗑 Delete</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

export function GoalsScreen() {
  const goals = useStore((s) => s.goals)
  const selectedId = useStore((s) => s.selectedGoalId)
  const selectGoal = useStore((s) => s.selectGoal)
  const [creating, setCreating] = useState(false)

  const visible = useMemo(
    () =>
      goals
        .filter((g) => !g.deleted && g.status !== 'archived')
        .sort(
          (a, b) =>
            (a.status === 'achieved' ? 1 : 0) - (b.status === 'achieved' ? 1 : 0) ||
            a.order - b.order ||
            a.createdAt.localeCompare(b.createdAt),
        ),
    [goals],
  )
  const selected = selectedId ? goals.find((g) => g.id === selectedId && !g.deleted) : null
  if (selected) return <GoalDetail goal={selected} onBack={() => selectGoal(null)} />

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Goals</Text>
        {!creating && (
          <Pressable style={styles.primaryBtnSm} onPress={() => setCreating(true)}>
            <Text style={styles.primaryBtnText}>＋ New goal</Text>
          </Pressable>
        )}
      </View>

      {creating && (
        <CreateGoalForm
          onDone={(id) => {
            setCreating(false)
            if (id) selectGoal(id)
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {visible.length === 0 && !creating ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No goals yet.</Text>
          <Text style={styles.emptySub}>Set a goal, then break it into daily tasks and habits to reach it.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => setCreating(true)}>
            <Text style={styles.primaryBtnText}>＋ Create your first goal</Text>
          </Pressable>
        </View>
      ) : (
        visible.map((g) => <GoalCard key={g.id} goal={g} onOpen={() => selectGoal(g.id)} />)
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800' },
  why: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  back: { color: colors.textDim, fontSize: 14, marginBottom: 12 },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 999, backgroundColor: colors.accent },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 18, padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  cardPct: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chipPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  chipPillText: { fontSize: 11, fontWeight: '700' },
  metaText: { color: colors.textFaint, fontSize: 12 },
  streakText: { color: colors.orange, fontSize: 12, fontWeight: '700' },
  // create form
  form: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, marginBottom: 16 },
  formTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 15, marginBottom: 8,
  },
  label: { color: colors.textFaint, fontSize: 11, fontWeight: '600', marginTop: 6, marginBottom: 6 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modeChip: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  modeChipOn: { borderColor: colors.accent, backgroundColor: 'rgba(30,132,227,0.1)' },
  modeChipText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  modeChipTextOn: { color: colors.accent },
  metricRow: { flexDirection: 'row', gap: 8 },
  formBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  flex1: { flex: 1 },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  primaryBtnSm: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ghostBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  ghostBtnText: { color: colors.text, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  // detail
  detailPctRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
  bigPct: { color: '#fff', fontSize: 30, fontWeight: '900', minWidth: 74 },
  progressLabel: { color: colors.textFaint, fontSize: 12, marginTop: 6 },
  achievedBanner: { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginTop: 14 },
  achievedText: { color: colors.green, fontWeight: '700' },
  sectionTitle: { color: colors.textFaint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 24, marginBottom: 6 },
  metricUpdate: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricInput: { width: 90, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: colors.text },
  projected: { color: colors.textFaint, fontSize: 12, marginTop: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textFaint, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '900', lineHeight: 15 },
  itemText: { color: colors.text, fontSize: 15 },
  itemTextDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  editInput: { flex: 1, color: colors.text, fontSize: 15, borderBottomWidth: 1, borderBottomColor: colors.accent, paddingVertical: 2 },
  unlink: { color: colors.textDim, fontSize: 12 },
  trash: { fontSize: 15, opacity: 0.7 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  addPlus: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  addInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18, flexWrap: 'wrap' },
  achieveBtn: { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  achieveBtnText: { color: colors.green, fontWeight: '700' },
  deleteBtn: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 10 },
  deleteText: { color: colors.rose, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: colors.textDim, fontSize: 14 },
  emptySub: { color: colors.textFaint, fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },
})
