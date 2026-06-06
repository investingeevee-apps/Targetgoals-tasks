import { useState, type HTMLAttributes } from 'react'
import { useStore } from '../store'
import type { TaskDTO } from '@targetgoals/shared'
import { formatDue, isOverdue } from '@targetgoals/shared'
import { Calendar, CheckCircle, Circle, Plus, Star, Trash } from './Icons'
import { GripHandle } from './Sortable'
import { GoalChip } from './GoalChip'

export function TaskItem({
  task,
  dragHandle,
}: {
  task: TaskDTO
  dragHandle?: HTMLAttributes<HTMLElement>
}) {
  const toggleTask = useStore((s) => s.toggleTask)
  const toggleStar = useStore((s) => s.toggleStar)
  const selectTask = useStore((s) => s.selectTask)
  const selectedTaskId = useStore((s) => s.selectedTaskId)
  const addSubtask = useStore((s) => s.addSubtask)
  const toggleSubtask = useStore((s) => s.toggleSubtask)
  const deleteSubtask = useStore((s) => s.deleteSubtask)

  const [expanded, setExpanded] = useState(false)
  const [subDraft, setSubDraft] = useState('')

  const selected = selectedTaskId === task.id
  const subDone = task.subtasks.filter((st) => st.completed).length
  const hasSubs = task.subtasks.length > 0

  return (
    <div className={`rounded-lg ${selected ? 'bg-slate-800/80' : ''}`}>
      <div
        className={`group flex items-start gap-2 rounded-lg px-2 py-2.5 transition-colors ${
          selected ? '' : 'hover:bg-slate-800/50'
        }`}
      >
        {dragHandle ? <GripHandle handle={dragHandle} /> : <span className="w-4 shrink-0" />}

        <button
          className={`mt-0.5 shrink-0 transition-colors ${
            task.completed ? 'text-accent' : 'text-slate-500 hover:text-slate-300'
          }`}
          onClick={() => toggleTask(task.id)}
          title={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed ? <CheckCircle /> : <Circle />}
        </button>

        <div className="min-w-0 flex-1">
          <button
            className="block w-full truncate text-left"
            onClick={() => selectTask(selected ? null : task.id)}
          >
            <span className={`text-sm ${task.completed ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
              {task.title}
            </span>
          </button>
          <div className="mt-0.5 flex items-center gap-3 text-xs">
            <GoalChip goalId={task.goalId} />
            {task.notes && !task.completed && (
              <span className="truncate text-slate-500">{task.notes}</span>
            )}
            {hasSubs && (
              <button
                className="inline-flex items-center gap-1 rounded bg-slate-800/70 py-0.5 pl-1 pr-1.5 text-slate-300 transition-colors hover:bg-slate-700"
                onClick={() => setExpanded((e) => !e)}
                title={expanded ? 'Hide subtasks' : 'Show subtasks'}
              >
                <span className="text-base font-bold leading-none text-accent">
                  {expanded ? '▾' : '▸'}
                </span>
                ☑ {subDone}/{task.subtasks.length}
              </button>
            )}
            {task.due && (
              <span
                className={`inline-flex items-center gap-1 ${
                  !task.completed && isOverdue(task.due) ? 'text-rose-400' : 'text-slate-500'
                }`}
              >
                <Calendar width={13} height={13} />
                {formatDue(task.due)}
              </span>
            )}
          </div>
        </div>

        <button
          className={`shrink-0 transition-colors ${
            task.starred
              ? 'text-amber-400'
              : 'text-slate-600 opacity-0 hover:text-amber-300 group-hover:opacity-100'
          }`}
          onClick={() => toggleStar(task.id)}
          title={task.starred ? 'Unstar' : 'Star'}
        >
          <Star width={18} height={18} fill={task.starred ? 'currentColor' : 'none'} />
        </button>
      </div>

      {hasSubs && expanded && (
        <div className="mb-1 ml-9 space-y-1 border-l border-slate-800 pl-3">
          {task.subtasks.map((st) => (
            <div key={st.id} className="group/s flex items-center gap-2">
              <button
                className={st.completed ? 'text-accent' : 'text-slate-500 hover:text-slate-300'}
                onClick={() => toggleSubtask(task.id, st.id)}
              >
                {st.completed ? <CheckCircle width={15} height={15} /> : <Circle width={15} height={15} />}
              </button>
              <span
                className={`flex-1 text-sm ${
                  st.completed ? 'text-slate-500 line-through' : 'text-slate-300'
                }`}
              >
                {st.title}
              </span>
              <button
                className="text-slate-600 opacity-0 transition hover:text-rose-400 group-hover/s:opacity-100"
                onClick={() => deleteSubtask(task.id, st.id)}
                title="Delete subtask"
              >
                <Trash width={13} height={13} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-0.5">
            <Plus width={13} height={13} className="text-accent" />
            <input
              value={subDraft}
              onChange={(e) => setSubDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && subDraft.trim()) {
                  addSubtask(task.id, subDraft)
                  setSubDraft('')
                }
              }}
              placeholder="Add a subtask"
              className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>
      )}
    </div>
  )
}
