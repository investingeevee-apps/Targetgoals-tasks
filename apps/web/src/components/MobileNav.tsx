import type { ReactNode } from 'react'
import { useStore } from '../store'
import type { Screen } from '@targetgoals/shared'
import { Chart, CheckCircle, Help, Repeat } from './Icons'

function GoalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

const TABS: { key: Screen; label: string; icon: ReactNode }[] = [
  { key: 'daily', label: 'Today', icon: <Repeat width={20} height={20} /> },
  { key: 'goals', label: 'Goals', icon: <GoalIcon /> },
  { key: 'tasks', label: 'Tasks', icon: <CheckCircle width={20} height={20} /> },
  { key: 'overview', label: 'Overview', icon: <Chart width={20} height={20} /> },
  { key: 'help', label: 'Help', icon: <Help width={20} height={20} /> },
]

/** Bottom tab bar shown on narrow (phone) viewports; the sidebar handles desktop. */
export function MobileNav() {
  const screen = useStore((s) => s.screen)
  const setScreen = useStore((s) => s.setScreen)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {TABS.map((tab) => {
        const active = screen === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => setScreen(tab.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              active ? 'text-accent' : 'text-slate-500'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
