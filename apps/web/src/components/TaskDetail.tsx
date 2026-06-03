import { useState } from 'react'
import { useStore } from '../store'
import type { TaskDTO } from '@targetgoals/shared'
import { CheckCircle, Circle, Close, Plus, Star, Trash } from './Icons'

export function TaskDetail({ task }: { task: TaskDTO }) {
  const updateTask = useStore((s) => s.updateTask)
  const toggleStar = useStore((s) => s.toggleStar)
  const deleteTask = useStore((s) => s.deleteTask)
  const selectTask = useStore((s) => s.selectTask)
  const addSubtask = useStore((s) => s.addSubtask)
  const toggleSubtask = useStore((s) => s.toggleSubtask)
  const renameSubtask = useStore((s) => s.renameSubtask)
  const deleteSubtask = useStore((s) => s.deleteSubtask)

  const [subDraft, setSubDraft] = useState('')
  const subDone = task.subtasks.filter((st) => st.completed).length

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-sm font-semibold text-slate-200">Details</span>
        <button
          className="text-slate-500 hover:text-slate-200"
          onClick={() => selectTask(null)}
          title="Close"
        >
          <Close width={18} height={18} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Title
          </label>
          <textarea
            value={task.title}
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            rows={2}
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Notes
          </label>
          <textarea
            value={task.notes}
            onChange={(e) => updateTask(task.id, { notes: e.target.value })}
            rows={5}
            placeholder="Add details…"
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Subtasks {task.subtasks.length > 0 && `(${subDone}/${task.subtasks.length})`}
          </label>
          <div className="space-y-1">
            {task.subtasks.map((st) => (
              <div key={st.id} className="group/sub flex items-center gap-2">
                <button
                  className={st.completed ? 'text-accent' : 'text-slate-500 hover:text-slate-300'}
                  onClick={() => toggleSubtask(task.id, st.id)}
                >
                  {st.completed ? <CheckCircle width={16} height={16} /> : <Circle width={16} height={16} />}
                </button>
                <input
                  value={st.title}
                  onChange={(e) => renameSubtask(task.id, st.id, e.target.value)}
                  className={`flex-1 bg-transparent text-sm outline-none ${
                    st.completed ? 'text-slate-500 line-through' : 'text-slate-200'
                  }`}
                />
                <button
                  className="text-slate-600 opacity-0 hover:text-rose-400 group-hover/sub:opacity-100"
                  onClick={() => deleteSubtask(task.id, st.id)}
                  title="Delete subtask"
                >
                  <Trash width={14} height={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 focus-within:border-accent">
            <Plus width={14} height={14} className="text-accent" />
            <input
              value={subDraft}
              onChange={(e) => setSubDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addSubtask(task.id, subDraft)
                  setSubDraft('')
                }
              }}
              placeholder="Add a subtask"
              className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Due date
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={task.due ?? ''}
              onChange={(e) =>
                updateTask(task.id, { due: e.target.value || null })
              }
              className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            />
            {task.due && (
              <button
                className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                onClick={() => updateTask(task.id, { due: null })}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <button
          className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            task.starred
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
              : 'border-slate-800 text-slate-300 hover:bg-slate-800/60'
          }`}
          onClick={() => toggleStar(task.id)}
        >
          <Star
            width={16}
            height={16}
            fill={task.starred ? 'currentColor' : 'none'}
          />
          {task.starred ? 'Starred' : 'Star this task'}
        </button>
      </div>

      <div className="border-t border-slate-800 p-4">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
          onClick={() => deleteTask(task.id)}
        >
          <Trash width={16} height={16} />
          Delete task
        </button>
      </div>
    </div>
  )
}
