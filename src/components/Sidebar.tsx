import { useState } from 'react'
import { useStore } from '../store'
import { Chart, ListIcon, Plus, Repeat } from './Icons'

export function Sidebar() {
  const lists = useStore((s) => s.lists)
  const screen = useStore((s) => s.screen)
  const currentListId = useStore((s) => s.currentListId)
  const selectList = useStore((s) => s.selectList)
  const setScreen = useStore((s) => s.setScreen)
  const addList = useStore((s) => s.addList)

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  function submit() {
    addList(name)
    setName('')
    setAdding(false)
  }

  const navBtn =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-lg font-bold tracking-tight text-white">Tally</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <button
          className={`${navBtn} ${
            screen === 'daily'
              ? 'bg-accent/15 text-accent'
              : 'text-slate-300 hover:bg-slate-800/60'
          }`}
          onClick={() => setScreen('daily')}
        >
          <Repeat width={18} height={18} />
          Daily tasks
        </button>
        <button
          className={`${navBtn} ${
            screen === 'overview'
              ? 'bg-accent/15 text-accent'
              : 'text-slate-300 hover:bg-slate-800/60'
          }`}
          onClick={() => setScreen('overview')}
        >
          <Chart width={18} height={18} />
          Overview
        </button>

        <div className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Lists
        </div>

        {lists.map((list) => {
          const active = screen === 'tasks' && currentListId === list.id
          return (
            <button
              key={list.id}
              className={`${navBtn} ${
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
              onClick={() => selectList(list.id)}
            >
              <ListIcon width={18} height={18} />
              <span className="truncate">{list.name}</span>
            </button>
          )
        })}

        {adding ? (
          <div className="px-1 pt-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={submit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') {
                  setName('')
                  setAdding(false)
                }
              }}
              placeholder="List name"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            />
          </div>
        ) : (
          <button
            className={`${navBtn} text-slate-400 hover:bg-slate-800/60 hover:text-slate-200`}
            onClick={() => setAdding(true)}
          >
            <Plus width={18} height={18} />
            New list
          </button>
        )}
      </nav>

      <div className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">
        Saved locally on this device
      </div>
    </aside>
  )
}
