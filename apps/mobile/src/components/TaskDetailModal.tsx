import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { addDays, formatDue, fromKey, todayKey } from '@targetgoals/shared'
import { useStore } from '../store'
import { colors } from '../theme'

const DUE_PRESETS: { label: string; value: string | null }[] = [
  { label: 'None', value: null },
  { label: 'Today', value: todayKey() },
  { label: 'Tomorrow', value: addDays(todayKey(), 1) },
  { label: 'Next week', value: addDays(todayKey(), 7) },
]

type SchedFreq = 'off' | 'daily' | 'weekly' | 'monthly'
const SCHED_FREQS: { key: SchedFreq; label: string }[] = [
  { key: 'off', label: 'One-time' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function TaskDetailModal() {
  const screen = useStore((s) => s.screen)
  const task = useStore((s) => s.tasks.find((t) => t.id === s.selectedTaskId && !t.deleted))
  const updateTask = useStore((s) => s.updateTask)
  const toggleStar = useStore((s) => s.toggleStar)
  const deleteTask = useStore((s) => s.deleteTask)
  const selectTask = useStore((s) => s.selectTask)
  const addSubtask = useStore((s) => s.addSubtask)
  const toggleSubtask = useStore((s) => s.toggleSubtask)
  const renameSubtask = useStore((s) => s.renameSubtask)
  const deleteSubtask = useStore((s) => s.deleteSubtask)
  const reorderSubtasks = useStore((s) => s.reorderSubtasks)
  const scheduleTask = useStore((s) => s.scheduleTask)
  const setTaskRecurrence = useStore((s) => s.setTaskRecurrence)

  const [subDraft, setSubDraft] = useState('')
  // Edit title/notes locally and commit on blur (avoids per-keystroke store
  // writes and the controlled-input "snap back" when clearing a field).
  const [titleDraft, setTitleDraft] = useState('')
  const [notesDraft, setNotesDraft] = useState('')
  useEffect(() => {
    if (task) {
      setTitleDraft(task.title)
      setNotesDraft(task.notes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  const open = screen === 'tasks' && !!task
  if (!task) return null
  const subDone = task.subtasks.filter((st) => st.completed).length
  const tid = task.id
  function moveSub(subId: string, dir: 'up' | 'down') {
    const ids = task!.subtasks.map((s) => s.id)
    const i = ids.indexOf(subId)
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    reorderSubtasks(tid, ids)
  }

  const rule = task.recurrence ?? null
  const freq: SchedFreq = rule?.freq ?? 'off'
  const todayDow = fromKey(todayKey()).getDay()
  const todayDom = fromKey(todayKey()).getDate()
  function setFreq(f: SchedFreq) {
    if (f === 'off') {
      setTaskRecurrence(tid, null)
      return
    }
    if (task!.scheduledDate) scheduleTask(tid, null)
    if (f === 'daily') setTaskRecurrence(tid, { freq: 'daily' })
    else if (f === 'weekly')
      setTaskRecurrence(tid, {
        freq: 'weekly',
        weekdays: rule?.weekdays?.length ? rule.weekdays : [todayDow],
      })
    else setTaskRecurrence(tid, { freq: 'monthly', monthday: rule?.monthday ?? todayDom })
  }
  function toggleWeekday(d: number) {
    const cur = new Set(rule?.weekdays ?? [])
    if (cur.has(d)) cur.delete(d)
    else cur.add(d)
    const weekdays = [...cur].sort((a, b) => a - b)
    setTaskRecurrence(tid, { freq: 'weekly', weekdays: weekdays.length ? weekdays : [todayDow] })
  }

  return (
    <Modal transparent visible={open} animationType="slide" onRequestClose={() => selectTask(null)}>
      <Pressable style={styles.backdrop} onPress={() => selectTask(null)}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={[styles.input, styles.titleInput]}
              value={titleDraft}
              onChangeText={setTitleDraft}
              onBlur={() => {
                if (titleDraft.trim() && titleDraft !== task.title) {
                  updateTask(task.id, { title: titleDraft })
                } else if (!titleDraft.trim()) {
                  setTitleDraft(task.title) // restore — a task can't be blank
                }
              }}
              multiline
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notesDraft}
              onChangeText={setNotesDraft}
              onBlur={() => {
                if (notesDraft !== task.notes) updateTask(task.id, { notes: notesDraft })
              }}
              placeholder="Add details…"
              placeholderTextColor={colors.textFaint}
              multiline
            />

            <Text style={styles.label}>
              Subtasks {task.subtasks.length > 0 ? `(${subDone}/${task.subtasks.length})` : ''}
            </Text>
            {task.subtasks.map((st) => (
              <View key={st.id} style={styles.subRow}>
                <View style={styles.subMoveCol}>
                  <Pressable onPress={() => moveSub(st.id, 'up')} hitSlop={6}>
                    <Text style={styles.subMoveBtn}>▲</Text>
                  </Pressable>
                  <Pressable onPress={() => moveSub(st.id, 'down')} hitSlop={6}>
                    <Text style={styles.subMoveBtn}>▼</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => toggleSubtask(task.id, st.id)} hitSlop={8}>
                  <View style={[styles.subCheck, st.completed && styles.subCheckDone]}>
                    {st.completed && <Text style={styles.subMark}>✓</Text>}
                  </View>
                </Pressable>
                <TextInput
                  key={`${st.id}:${st.title}`}
                  style={[styles.subInput, st.completed && styles.subInputDone]}
                  defaultValue={st.title}
                  onEndEditing={(e) => {
                    const v = e.nativeEvent.text
                    if (v.trim() && v !== st.title) renameSubtask(task.id, st.id, v)
                  }}
                />
                <Pressable onPress={() => deleteSubtask(task.id, st.id)} hitSlop={8}>
                  <Text style={styles.subTrash}>🗑</Text>
                </Pressable>
              </View>
            ))}
            <View style={styles.subAddRow}>
              <Text style={styles.subPlus}>＋</Text>
              <TextInput
                style={styles.subAddInput}
                value={subDraft}
                onChangeText={setSubDraft}
                placeholder="Add a subtask"
                placeholderTextColor={colors.textFaint}
                returnKeyType="done"
                onSubmitEditing={() => {
                  addSubtask(task.id, subDraft)
                  setSubDraft('')
                }}
              />
            </View>

            <Text style={styles.label}>Due date {task.due ? `· ${formatDue(task.due)}` : ''}</Text>
            <View style={styles.chipRow}>
              {DUE_PRESETS.map((p) => {
                const active = (task.due ?? null) === p.value
                return (
                  <Pressable
                    key={p.label}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateTask(task.id, { due: p.value })}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
                  </Pressable>
                )
              })}
            </View>
            <TextInput
              style={styles.input}
              value={task.due ?? ''}
              onChangeText={(v) => updateTask(task.id, { due: /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : v || null })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Add to Today</Text>
            <View style={styles.chipRow}>
              {SCHED_FREQS.map((f) => {
                const active = freq === f.key
                return (
                  <Pressable
                    key={f.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setFreq(f.key)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                  </Pressable>
                )
              })}
            </View>

            {freq === 'off' && (
              <View style={styles.chipRow}>
                {[
                  { label: 'None', value: null },
                  { label: 'Today', value: todayKey() },
                  { label: 'Tomorrow', value: addDays(todayKey(), 1) },
                ].map((p) => {
                  const active = (task.scheduledDate ?? null) === p.value
                  return (
                    <Pressable
                      key={p.label}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => scheduleTask(tid, p.value)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            )}

            {freq === 'weekly' && (
              <View style={styles.weekRow}>
                {WEEKDAY_LETTERS.map((w, i) => {
                  const on = (rule?.weekdays ?? []).includes(i)
                  return (
                    <Pressable
                      key={i}
                      style={[styles.dayBtn, on && styles.dayBtnOn]}
                      onPress={() => toggleWeekday(i)}
                    >
                      <Text style={[styles.dayTxt, on && styles.dayTxtOn]}>{w}</Text>
                    </Pressable>
                  )
                })}
              </View>
            )}

            {freq === 'monthly' && (
              <View style={styles.monthRow}>
                <Text style={styles.subtle2}>On day</Text>
                <TextInput
                  style={styles.monthInput}
                  keyboardType="number-pad"
                  value={String(rule?.monthday ?? 1)}
                  onChangeText={(v) => {
                    const n = Math.min(31, Math.max(1, Number(v) || 1))
                    setTaskRecurrence(tid, { freq: 'monthly', monthday: n })
                  }}
                />
                <Text style={styles.subtle2}>of each month</Text>
              </View>
            )}

            <Pressable
              style={[styles.starBtn, task.starred && styles.starBtnActive]}
              onPress={() => toggleStar(task.id)}
            >
              <Text style={[styles.starText, task.starred && styles.starTextActive]}>
                {task.starred ? '★ Starred' : '☆ Star this task'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.deleteBtn}
              onPress={() => {
                deleteTask(task.id)
                selectTask(null)
              }}
            >
              <Text style={styles.deleteText}>🗑  Delete task</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  label: { color: colors.textFaint, fontSize: 11, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 15,
  },
  titleInput: { fontSize: 16, fontWeight: '600' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  subMoveCol: { justifyContent: 'center' },
  subMoveBtn: { color: colors.textFaint, fontSize: 10, lineHeight: 13 },
  subCheck: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.textFaint,
    alignItems: 'center', justifyContent: 'center',
  },
  subCheckDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  subMark: { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14 },
  subInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 2 },
  subInputDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  subTrash: { fontSize: 14, opacity: 0.7 },
  subAddRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  subPlus: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  subAddInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 2 },
  notesInput: { minHeight: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  weekRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  dayBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dayBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayTxt: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  dayTxtOn: { color: '#fff' },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  monthInput: {
    width: 56, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: colors.text, textAlign: 'center',
  },
  subtle2: { color: colors.textDim, fontSize: 13 },
  starBtn: {
    marginTop: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  starBtnActive: { borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.1)' },
  starText: { color: colors.text, fontWeight: '600' },
  starTextActive: { color: colors.amber },
  deleteBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  deleteText: { color: colors.rose, fontWeight: '600' },
})
