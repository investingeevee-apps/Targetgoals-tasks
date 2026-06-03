import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { addDays, formatDue, todayKey } from '@targetgoals/shared'
import { useStore } from '../store'
import { colors } from '../theme'

const DUE_PRESETS: { label: string; value: string | null }[] = [
  { label: 'None', value: null },
  { label: 'Today', value: todayKey() },
  { label: 'Tomorrow', value: addDays(todayKey(), 1) },
  { label: 'Next week', value: addDays(todayKey(), 7) },
]

export function TaskDetailModal() {
  const screen = useStore((s) => s.screen)
  const task = useStore((s) => s.tasks.find((t) => t.id === s.selectedTaskId && !t.deleted))
  const updateTask = useStore((s) => s.updateTask)
  const toggleStar = useStore((s) => s.toggleStar)
  const deleteTask = useStore((s) => s.deleteTask)
  const selectTask = useStore((s) => s.selectTask)

  const open = screen === 'tasks' && !!task
  if (!task) return null

  return (
    <Modal transparent visible={open} animationType="slide" onRequestClose={() => selectTask(null)}>
      <Pressable style={styles.backdrop} onPress={() => selectTask(null)}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={[styles.input, styles.titleInput]}
              value={task.title}
              onChangeText={(title) => updateTask(task.id, { title })}
              multiline
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={task.notes}
              onChangeText={(notes) => updateTask(task.id, { notes })}
              placeholder="Add details…"
              placeholderTextColor={colors.textFaint}
              multiline
            />

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
  notesInput: { minHeight: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  starBtn: {
    marginTop: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  starBtnActive: { borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.1)' },
  starText: { color: colors.text, fontWeight: '600' },
  starTextActive: { color: colors.amber },
  deleteBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  deleteText: { color: colors.rose, fontWeight: '600' },
})
