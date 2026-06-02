import { useStore } from '../store'
import type { Task } from '@targetgoals/shared'
import { Close, Star, Trash } from './Icons'

export function TaskDetail({ task }: { task: Task }) {
  const updateTask = useStore((s) => s.updateTask)
  const toggleStar = useStore((s) => s.toggleStar)
  const deleteTask = useStore((s) => s.deleteTask)
  const selectTask = useStore((s) => s.selectTask)

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
            placeholder="Add detailsâ€¦"
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent"
          />
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
                updateTask(task.id, { due: e.target.value || undefined })
              }
              className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent"
            />
            {task.due && (
              <button
                className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                onClick={() => updateTask(task.id, { due: undefined })}
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
