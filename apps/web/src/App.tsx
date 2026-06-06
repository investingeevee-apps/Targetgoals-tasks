import { useEffect } from 'react'
import { useStore } from './store'
import { initSync } from './sync/store'
import { Sidebar } from './components/Sidebar'
import { TasksScreen } from './components/TasksScreen'
import { DailyScreen } from './components/DailyScreen'
import { OverviewScreen } from './components/OverviewScreen'
import { GoalsScreen } from './components/GoalsScreen'
import { HelpScreen } from './components/HelpScreen'
import { TaskDetail } from './components/TaskDetail'
import { Celebration } from './components/Celebration'
import { SyncSettingsModal } from './components/SyncSettings'
import { UpdatePrompt } from './components/UpdatePrompt'

export default function App() {
  const screen = useStore((s) => s.screen)
  const selectedTaskId = useStore((s) => s.selectedTaskId)
  const selectedTask = useStore((s) =>
    s.tasks.find((t) => t.id === s.selectedTaskId && !t.deleted),
  )

  useEffect(() => {
    initSync()
  }, [])

  return (
    <div className="flex h-full bg-slate-900 text-slate-100">
      <Sidebar />

      <main className="flex min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {screen === 'tasks' && <TasksScreen />}
          {screen === 'daily' && <DailyScreen />}
          {screen === 'goals' && <GoalsScreen />}
          {screen === 'overview' && <OverviewScreen />}
          {screen === 'help' && <HelpScreen />}
        </div>

        {screen === 'tasks' && selectedTaskId && selectedTask && (
          <TaskDetail task={selectedTask} />
        )}
      </main>

      <Celebration />
      <SyncSettingsModal />
      <UpdatePrompt />
    </div>
  )
}
