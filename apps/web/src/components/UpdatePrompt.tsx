import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Shows a banner when a newly deployed version is available, naming the version
 * to update to (Claude-style "Relaunch to update to x.x.x"). The target version
 * is read from /version.json, which the build emits and which isn't precached,
 * so it always reflects the freshly deployed build.
 */
export function UpdatePrompt() {
  const [version, setVersion] = useState<string | null>(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // check for a new version every 30 minutes
      if (registration) {
        setInterval(() => registration.update(), 30 * 60 * 1000)
      }
    },
    onNeedRefresh() {
      // Learn which version we're updating to (best-effort).
      fetch('/version.json', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setVersion(d?.version ?? null))
        .catch(() => setVersion(null))
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 shadow-2xl">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-100">
          {version ? `Update available — version ${version}` : 'A new version is available'}
        </span>
        <span className="text-xs text-slate-500">
          Reload to get the latest TargetGoals Tasks.
        </span>
      </div>
      <button
        className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
        onClick={() => updateServiceWorker(true)}
      >
        Reload
      </button>
      <button
        className="shrink-0 text-sm text-slate-500 hover:text-slate-300"
        onClick={() => setNeedRefresh(false)}
      >
        Later
      </button>
    </div>
  )
}
