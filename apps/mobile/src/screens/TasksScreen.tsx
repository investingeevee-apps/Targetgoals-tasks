import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { formatDue, isOverdue } from '@targetgoals/shared'
import type { TaskDTO } from '@targetgoals/shared'
import { useStore } from '../store'
import { colors } from '../theme'

export function TasksScreen() {
  const allLists = useStore((s) => s.lists)
  const allTasks = useStore((s) => s.tasks)
  const currentListId = useStore((s) => s.currentListId)
  const selectList = useStore((s) => s.selectList)
  const addList = useStore((s) => s.addList)
  const renameList = useStore((s) => s.renameList)
  const deleteList = useStore((s) => s.deleteList)
  const addTask = useStore((s) => s.addTask)
  const toggleTask = useStore((s) => s.toggleTask)
  const toggleStar = useStore((s) => s.toggleStar)
  const selectTask = useStore((s) => s.selectTask)
  const clearCompleted = useStore((s) => s.clearCompleted)

  const lists = useMemo(() => allLists.filter((l) => !l.deleted), [allLists])
  const currentList = lists.find((l) => l.id === currentListId) ?? lists[0]
  const listId = currentList?.id ?? null

  const [draft, setDraft] = useState('')
  const [addingList, setAddingList] = useState(false)
  const [listName, setListName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  // keep the persisted selection valid
  useEffect(() => {
    if (listId && listId !== currentListId) selectList(listId)
  }, [listId, currentListId, selectList])

  const { active, done } = useMemo(() => {
    const mine = allTasks.filter((t) => t.listId === listId && !t.deleted)
    const byStar = (a: TaskDTO, b: TaskDTO) =>
      a.starred !== b.starred ? (a.starred ? -1 : 1) : a.createdAt.localeCompare(b.createdAt)
    return {
      active: mine.filter((t) => !t.completed).sort(byStar),
      done: mine
        .filter((t) => t.completed)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    }
  }, [allTasks, listId])

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* list switcher */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar}>
        {lists.map((l) => {
          const activeChip = l.id === listId
          return (
            <Pressable
              key={l.id}
              style={[styles.listChip, activeChip && styles.listChipActive]}
              onPress={() => selectList(l.id)}
            >
              <Text style={[styles.listChipText, activeChip && styles.listChipTextActive]}>{l.name}</Text>
            </Pressable>
          )
        })}
        {addingList ? (
          <TextInput
            style={styles.listInput}
            value={listName}
            onChangeText={setListName}
            placeholder="List name"
            placeholderTextColor={colors.textFaint}
            autoFocus
            returnKeyType="done"
            onBlur={() => {
              if (listName.trim()) addList(listName)
              setListName('')
              setAddingList(false)
            }}
            onSubmitEditing={() => {
              if (listName.trim()) addList(listName)
              setListName('')
              setAddingList(false)
            }}
          />
        ) : (
          <Pressable style={styles.listChip} onPress={() => setAddingList(true)}>
            <Text style={styles.listChipText}>＋ List</Text>
          </Pressable>
        )}
      </ScrollView>

      {!currentList ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>No lists yet. Tap “＋ List” to create one.</Text>
        </View>
      ) : (
        <>
          {/* list header */}
          <View style={styles.headerRow}>
            {editingName ? (
              <TextInput
                style={styles.titleInput}
                value={nameDraft}
                onChangeText={setNameDraft}
                autoFocus
                onBlur={() => {
                  renameList(currentList.id, nameDraft)
                  setEditingName(false)
                }}
                onSubmitEditing={() => {
                  renameList(currentList.id, nameDraft)
                  setEditingName(false)
                }}
              />
            ) : (
              <Pressable
                onPress={() => {
                  setNameDraft(currentList.name)
                  setEditingName(true)
                }}
              >
                <Text style={styles.h1}>{currentList.name}</Text>
              </Pressable>
            )}
            <Pressable
              hitSlop={8}
              onPress={() =>
                Alert.alert('Delete list', `Delete “${currentList.name}” and its tasks?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteList(currentList.id) },
                ])
              }
            >
              <Text style={styles.deleteList}>Delete</Text>
            </Pressable>
          </View>

          {/* add task */}
          <View style={styles.addRow}>
            <Text style={styles.addPlus}>＋</Text>
            <TextInput
              style={styles.addInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a task"
              placeholderTextColor={colors.textFaint}
              returnKeyType="done"
              onSubmitEditing={() => {
                addTask(currentList.id, draft)
                setDraft('')
              }}
            />
          </View>

          {active.length === 0 && done.length === 0 && (
            <Text style={styles.empty}>No tasks yet. Add your first one above.</Text>
          )}

          {active.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={toggleTask} onStar={toggleStar} onOpen={selectTask} />
          ))}

          {done.length > 0 && (
            <View style={{ marginTop: 18 }}>
              <View style={styles.completedHeader}>
                <Text style={styles.completedLabel}>Completed ({done.length})</Text>
                <Pressable onPress={() => clearCompleted(currentList.id)}>
                  <Text style={styles.clearAll}>Clear all</Text>
                </Pressable>
              </View>
              {done.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={toggleTask} onStar={toggleStar} onOpen={selectTask} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

function TaskRow({
  task,
  onToggle,
  onStar,
  onOpen,
}: {
  task: TaskDTO
  onToggle: (id: string) => void
  onStar: (id: string) => void
  onOpen: (id: string) => void
}) {
  return (
    <View style={styles.taskRow}>
      <Pressable onPress={() => onToggle(task.id)} hitSlop={8}>
        <View style={[styles.check, task.completed && styles.checkDone]}>
          {task.completed && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </Pressable>
      <Pressable style={{ flex: 1 }} onPress={() => onOpen(task.id)}>
        <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          {task.notes && !task.completed ? (
            <Text style={styles.meta} numberOfLines={1}>
              {task.notes}
            </Text>
          ) : null}
          {task.due ? (
            <Text style={[styles.meta, !task.completed && isOverdue(task.due) && styles.metaOverdue]}>
              📅 {formatDue(task.due)}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable onPress={() => onStar(task.id)} hitSlop={8}>
        <Text style={[styles.star, task.starred && styles.starActive]}>{task.starred ? '★' : '☆'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  chipBar: { flexDirection: 'row', marginBottom: 16 },
  listChip: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
  },
  listChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  listChipText: { color: colors.textDim, fontSize: 13 },
  listChipTextActive: { color: '#fff', fontWeight: '700' },
  listInput: {
    borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.surface, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 6, color: colors.text, fontSize: 13, minWidth: 120,
  },
  emptyWrap: { marginTop: 60, alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800' },
  titleInput: { color: '#fff', fontSize: 24, fontWeight: '800', flex: 1, borderBottomWidth: 1, borderBottomColor: colors.accent },
  deleteList: { color: colors.textFaint, fontSize: 12 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  addPlus: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  addInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 4 },
  empty: { color: colors.textFaint, textAlign: 'center', marginTop: 24 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11 },
  check: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textFaint,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '900', lineHeight: 15 },
  taskTitle: { color: colors.text, fontSize: 15 },
  taskTitleDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  meta: { color: colors.textFaint, fontSize: 12 },
  metaOverdue: { color: colors.rose },
  star: { fontSize: 18, color: colors.textFaint, marginTop: 1 },
  starActive: { color: colors.amber },
  completedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  completedLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  clearAll: { color: colors.textFaint, fontSize: 12 },
})
