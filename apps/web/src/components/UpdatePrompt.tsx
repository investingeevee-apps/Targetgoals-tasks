import { useRegisterSW } from 'virtual:pwa-register/react'

/** Shows a small banner with a Reload button when a new version is available. */
export function UpdatePrompt() {
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
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 shadow-2xl">
      <span className="text-sm text-slate-200">A new version is available.</span>
      <button
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
        onClick={() => updateServiceWorker(true)}
      >
        Reload
      </button>
      <button
        className="text-sm text-slate-500 hover:text-slate-300"
        onClick={() => setNeedRefresh(false)}
      >
        Later
      </button>
    </div>
  )
}
