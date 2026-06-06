import { useEffect, useMemo } from 'react'
import { useStore } from '../store'
import { Flame } from './Icons'

const CONFETTI_COLORS = [
  '#1a73e8',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#a855f7',
  '#ec4899',
  '#38bdf8',
]

function Confetti() {
  // Generated once per mount; randomness is fine in the browser runtime.
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        size: 7 + Math.random() * 7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.6,
      })),
    [],
  )

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

export function Celebration() {
  const celebration = useStore((s) => s.celebration)
  const dismiss = useStore((s) => s.dismissCelebration)

  useEffect(() => {
    if (!celebration) return
    const big = celebration.kind === 'allDone' || celebration.kind === 'goal'
    const timer = setTimeout(dismiss, big ? 5000 : 3600)
    return () => clearTimeout(timer)
  }, [celebration, dismiss])

  if (!celebration) return null

  const allDone = celebration.kind === 'allDone'
  const goal = celebration.kind === 'goal'
  const big = allDone || goal
  const streakLabel = `${celebration.streak} day${celebration.streak === 1 ? '' : 's'}`

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm"
      onClick={dismiss}
    >
      {big && <Confetti />}

      <div
        className="animate-pop-in relative mx-4 w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* glow */}
        <div
          className={`absolute inset-x-0 -top-px mx-auto h-24 w-3/4 rounded-full blur-3xl ${
            big ? 'bg-emerald-500/30' : 'bg-flame/30'
          }`}
        />

        <div className="relative">
          {goal ? (
            <div className="mx-auto mb-2 text-6xl">🏆</div>
          ) : allDone ? (
            <div className="mx-auto mb-2 text-6xl">🎉</div>
          ) : (
            <div className="animate-flame mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-flame to-rose-500 text-white shadow-lg shadow-flame/30">
              <Flame width={34} height={34} fill="currentColor" />
            </div>
          )}

          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {goal ? 'Goal achieved!' : allDone ? 'Perfect day!' : "You're on a hot streak!"}
          </h2>

          <p className="mt-1.5 text-sm text-slate-400">
            {goal
              ? `You reached “${celebration.title}”. That's the whole point.`
              : allDone
                ? `All ${celebration.total} daily tasks complete. Nothing left for today.`
                : 'First task logged today — keep the momentum going.'}
          </p>

          {!goal && (
            <div
              className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                allDone ? 'bg-emerald-500/15 text-emerald-400' : 'bg-flame/15 text-flame'
              }`}
            >
              <Flame width={16} height={16} />
              {streakLabel} streak
            </div>
          )}

          <button
            className="mt-6 block w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            onClick={dismiss}
          >
            {goal ? 'Awesome' : allDone ? 'Nice!' : 'Keep going'}
          </button>
        </div>
      </div>
    </div>
  )
}
