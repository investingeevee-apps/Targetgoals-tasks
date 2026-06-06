import { useStore } from '../store'

/** Small chip showing the goal a task/habit is linked to; tap to open that goal. */
export function GoalChip({ goalId }: { goalId?: string | null }) {
  const goal = useStore((s) =>
    goalId ? s.goals.find((g) => g.id === goalId && !g.deleted) : undefined,
  )
  const selectGoal = useStore((s) => s.selectGoal)
  if (!goal) return null
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        selectGoal(goal.id)
      }}
      className="inline-flex max-w-[150px] items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
      title={`Goal: ${goal.title}`}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
      <span className="truncate">{goal.title}</span>
    </button>
  )
}
