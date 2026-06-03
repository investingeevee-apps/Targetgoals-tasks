import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native'
import { computeStreaks, formatLongDate, todayKey } from '@targetgoals/shared'
import { useStore } from '../store'
import { buildDailyLog } from '../lib/transform'
import { colors } from '../theme'

export function DailyScreen() {
  const allDailyTasks = useStore((s) => s.dailyTasks)
  const completions = useStore((s) => s.dailyCompletions)
  const addDailyTask = useStore((s) => s.addDailyTask)
  const deleteDailyTask = useStore((s) => s.deleteDailyTask)
  const renameDailyTask = useStore((s) => s.renameDailyTask)
  const toggleDailyToday = useStore((s) => s.toggleDailyToday)
  const reorderDailyTasks = useStore((s) => s.reorderDailyTasks)

  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  function commitRename() {
    if (editingId) renameDailyTask(editingId, editDraft)
    setEditingId(null)
    setEditDraft('')
  }

  function move(id: string, dir: 'up' | 'down') {
    const ids = active.map((d) => d.id)
    const i = ids.indexOf(id)
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    reorderDailyTasks(ids)
  }

  const key = todayKey()
  const dailyLog = useMemo(() => buildDailyLog(completions), [completions])
  const doneToday = useMemo(() => new Set(dailyLog[key] ?? []), [dailyLog, key])
  const active = useMemo(
    () =>
      allDailyTasks
        .filter((d) => !d.deleted && !d.archived)
        .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)),
    [allDailyTasks],
  )
  const completedCount = active.filter((d) => doneToday.has(d.id)).length
  const pct = active.length ? Math.round((completedCount / active.length) * 100) : 0
  const streaks = useMemo(
    () => computeStreaks(allDailyTasks, completions),
    [allDailyTasks, completions],
  )

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.h1}>Daily tasks</Text>
          <Text style={styles.subtle}>{formatLongDate(key)}</Text>
        </View>
        <View style={styles.streak}>
          <Text style={styles.streakText}>🔥 {streaks.currentStreak} day streak</Text>
        </View>
      </View>

      <View style={styles.progressLabelRow}>
        <Text style={styles.subtle}>Today's progress</Text>
        <Text style={styles.subtle}>
          {completedCount} of {active.length} done
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>

      <View style={styles.addRow}>
        <Text style={styles.addPlus}>＋</Text>
        <TextInput
          style={styles.addInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a recurring daily task"
          placeholderTextColor={colors.textFaint}
          returnKeyType="done"
          onSubmitEditing={() => {
            addDailyTask(draft)
            setDraft('')
          }}
        />
      </View>

      {active.length === 0 && (
        <Text style={styles.empty}>No daily tasks yet. Add habits to track every day.</Text>
      )}

      {active.map((d) => {
        const done = doneToday.has(d.id)
        const editing = editingId === d.id
        return (
          <View key={d.id} style={styles.taskRow}>
            {!editing && (
              <View style={styles.moveCol}>
                <Pressable onPress={() => move(d.id, 'up')} hitSlop={6}>
                  <Text style={styles.moveBtn}>▲</Text>
                </Pressable>
                <Pressable onPress={() => move(d.id, 'down')} hitSlop={6}>
                  <Text style={styles.moveBtn}>▼</Text>
                </Pressable>
              </View>
            )}
            <Pressable onPress={() => toggleDailyToday(d.id)} hitSlop={8}>
              <View style={[styles.check, done && styles.checkDone]}>
                {done && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </Pressable>

            {editing ? (
              <TextInput
                style={styles.editInput}
                value={editDraft}
                onChangeText={setEditDraft}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={commitRename}
                onBlur={commitRename}
              />
            ) : (
              <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>{d.title}</Text>
            )}

            {editing ? (
              <Pressable onPress={commitRename} hitSlop={8}>
                <Text style={styles.save}>Save</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setEditingId(d.id)
                  setEditDraft(d.title)
                }}
                hitSlop={8}
                style={styles.rowAction}
              >
                <Text style={styles.pencil}>✎</Text>
              </Pressable>
            )}

            {!editing && (
              <Pressable onPress={() => deleteDailyTask(d.id)} hitSlop={8} style={styles.rowAction}>
                <Text style={styles.trash}>🗑</Text>
              </Pressable>
            )}
          </View>
        )
      })}

      <Text style={styles.footer}>Resets every day · history lives in Overview</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtle: { color: colors.textDim, fontSize: 13 },
  streak: { backgroundColor: 'rgba(249,115,22,0.12)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  streakText: { color: colors.orange, fontWeight: '700', fontSize: 13 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 6 },
  progressTrack: { height: 10, backgroundColor: colors.surfaceAlt, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: 10, backgroundColor: colors.accent, borderRadius: 999 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  addPlus: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  addInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 4 },
  empty: { color: colors.textFaint, textAlign: 'center', marginTop: 40 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  moveCol: { justifyContent: 'center' },
  moveBtn: { color: colors.textFaint, fontSize: 11, lineHeight: 14 },
  check: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.textFaint,
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 16 },
  taskTitle: { flex: 1, color: colors.text, fontSize: 15 },
  taskTitleDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  editInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: 2,
  },
  rowAction: { paddingHorizontal: 2 },
  pencil: { fontSize: 15, color: colors.textDim },
  save: { fontSize: 14, fontWeight: '700', color: colors.accent },
  trash: { fontSize: 16, opacity: 0.7 },
  footer: { color: colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: 24 },
})
