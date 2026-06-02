import { useStore } from '../store'
import type { Task } from '../types'
import { formatDue, isOverdue } from '../lib/dates'
import { Calendar, CheckCircle, Circle, Star } from './Icons'

export function TaskItem({ task }: { task: Task }) {
  const toggleTask = useStore((s) => s.toggleTask)
  const toggleStar = useStore((s) => s.toggleStar)
  const selectTask = useStore((s) => s.selectTask)
  const selectedTaskId = useStore((s) => s.selectedTaskId)

  const selected = selectedTaskId === task.id

  return (
    <div
      className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        selected ? 'bg-slate-800/80' : 'hover:bg-slate-800/50'
      }`}
    >
      <button
        className={`mt-0.5 shrink-0 transition-colors ${
          task.completed
            ? 'text-accent'
            : 'text-slate-500 hover:text-slate-300'
        }`}
        onClick={() => toggleTask(task.id)}
        title={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed ? <CheckCircle /> : <Circle />}
      </button>

      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => selectTask(selected ? null : task.id)}
      >
        <div
          className={`truncate text-sm ${
            task.completed
              ? 'text-slate-500 line-through'
              : 'text-slate-100'
          }`}
        >
          {task.title}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs">
          {task.notes && !task.completed && (
            <span className="truncate text-slate-500">{task.notes}</span>
          )}
          {task.due && (
            <span
              className={`inline-flex items-center gap-1 ${
                !task.completed && isOverdue(task.due)
                  ? 'text-rose-400'
                  : 'text-slate-500'
              }`}
            >
              <Calendar width={13} height={13} />
              {formatDue(task.due)}
            </span>
          )}
        </div>
      </button>

      <button
        className={`shrink-0 transition-colors ${
          task.starred
            ? 'text-amber-400'
            : 'text-slate-600 opacity-0 hover:text-amber-300 group-hover:opacity-100'
        }`}
        onClick={() => toggleStar(task.id)}
        title={task.starred ? 'Unstar' : 'Star'}
      >
        <Star
          width={18}
          height={18}
          fill={task.starred ? 'currentColor' : 'none'}
        />
      </button>
    </div>
  )
}
