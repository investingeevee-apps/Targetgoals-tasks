import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Plus } from './Icons'
import { TaskItem } from './TaskItem'
import { SortableList, SortableRow } from './Sortable'

export function TasksScreen() {
  const currentListId = useStore((s) => s.currentListId)
  const list = useStore((s) =>
    s.lists.find((l) => l.id === s.currentListId && !l.deleted),
  )
  const tasks = useStore((s) => s.tasks)
  const allLists = useStore((s) => s.lists)
  const addTask = useStore((s) => s.addTask)
  const addList = useStore((s) => s.addList)
  const selectList = useStore((s) => s.selectList)
  const renameList = useStore((s) => s.renameList)
  const deleteList = useStore((s) => s.deleteList)
  const clearCompleted = useStore((s) => s.clearCompleted)
  const reorderTasks = useStore((s) => s.reorderTasks)

  const [draft, setDraft] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const visibleLists = useMemo(() => allLists.filter((l) => !l.deleted), [allLists])
  function newList() {
    const name = window.prompt('New list name')?.trim()
    if (name) addList(name)
  }

  const { active, done } = useMemo(() => {
    const mine = tasks.filter((t) => t.listId === currentListId && !t.deleted)
    const byOrder = (a: typeof mine[number], b: typeof mine[number]) =>
      a.order - b.order || a.createdAt.localeCompare(b.createdAt)
    return {
      active: mine.filter((t) => !t.completed).sort(byOrder),
      done: mine
        .filter((t) => t.completed)
        .sort((a, b) =>
          (b.completedAt ?? '').localeCompare(a.completedAt ?? ''),
        ),
    }
  }, [tasks, currentListId])

  if (!list || !currentListId) {
    return (
      <div className="grid flex-1 place-items-center px-6 text-center text-slate-500">
        <div>
          <p>No list selected.</p>
          {visibleLists.length > 0 ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {visibleLists.map((l) => (
                <button
                  key={l.id}
                  onClick={() => selectList(l.id)}
                  className="rounded-full border border-slate-800 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800/60"
                >
                  {l.name}
                </button>
              ))}
            </div>
          ) : null}
          <button
            onClick={newList}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            + New list
          </button>
        </div>
      </div>
    )
  }

  function submit() {
    if (!currentListId) return
    addTask(currentListId, draft)
    setDraft('')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
      {/* Mobile list switcher (the sidebar is hidden on phones) */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto md:hidden">
        {visibleLists.map((l) => (
          <button
            key={l.id}
            onClick={() => selectList(l.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              l.id === currentListId
                ? 'bg-accent text-white'
                : 'border border-slate-800 text-slate-300'
            }`}
          >
            {l.name}
          </button>
        ))}
        <button
          onClick={newList}
          className="shrink-0 rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400"
        >
          + New
        </button>
      </div>

      <header className="mb-6 flex items-center justify-between gap-3">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              renameList(currentListId, nameDraft)
              setEditingName(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                renameList(currentListId, nameDraft)
                setEditingName(false)
              }
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-2xl font-bold text-white outline-none focus:border-accent"
          />
        ) : (
          <h1
            className="cursor-text text-2xl font-bold text-white"
            title="Click to rename"
            onClick={() => {
              setNameDraft(list.name)
              setEditingName(true)
            }}
          >
            {list.name}
          </h1>
        )}
        <button
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-rose-300"
          onClick={() => {
            if (confirm(`Delete list "${list.name}" and its tasks?`))
              deleteList(currentListId)
          }}
        >
          Delete list
        </button>
      </header>

      {/* Add task */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 focus-within:border-accent">
        <Plus width={18} height={18} className="text-accent" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Add a task"
          className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {active.length === 0 && done.length === 0 && (
          <div className="mt-16 text-center text-sm text-slate-500">
            No tasks yet. Add your first one above.
          </div>
        )}

        <div className="space-y-0.5">
          <SortableList
            ids={active.map((t) => t.id)}
            onReorder={(ids) => reorderTasks(currentListId, ids)}
          >
            {active.map((t) => (
              <SortableRow key={t.id} id={t.id}>
                {(handle) => <TaskItem task={t} dragHandle={handle} />}
              </SortableRow>
            ))}
          </SortableList>
        </div>

        {done.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Completed ({done.length})
              </span>
              <button
                className="text-xs text-slate-500 hover:text-slate-300"
                onClick={() => clearCompleted(currentListId)}
              >
                Clear all
              </button>
            </div>
            <div className="space-y-0.5">
              {done.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
