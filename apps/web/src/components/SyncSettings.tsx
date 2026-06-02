import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { useSync, type SyncStatus } from '../sync/store'
import { hasLegacyData } from '../lib/transform'
import { Close } from './Icons'

const STATUS_META: Record<SyncStatus, { label: string; dot: string; pulse?: boolean }> = {
  disconnected: { label: 'Local only', dot: 'bg-slate-500' },
  connecting: { label: 'Connecting…', dot: 'bg-amber-400', pulse: true },
  idle: { label: 'Synced', dot: 'bg-emerald-500' },
  syncing: { label: 'Syncing…', dot: 'bg-accent', pulse: true },
  error: { label: 'Sync error', dot: 'bg-rose-500' },
  offline: { label: 'Offline', dot: 'bg-amber-400' },
}

function relativeTime(ms: number): string {
  if (!ms) return 'never'
  const diff = Date.now() - ms
  if (diff < 0) return 'just now'
  const s = Math.floor(diff / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/** Compact status chip for the sidebar footer; opens the settings modal. */
export function SyncStatusButton() {
  const status = useSync((s) => s.status)
  const openSettings = useSync((s) => s.openSettings)
  const meta = STATUS_META[status]
  return (
    <button
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
      onClick={openSettings}
      title="Sync settings"
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot} ${meta.pulse ? 'animate-pulse' : ''}`} />
      <span className="flex-1 text-left">{meta.label}</span>
      <span className="text-slate-600">⚙</span>
    </button>
  )
}

export function SyncSettingsModal() {
  const open = useSync((s) => s.settingsOpen)
  const close = useSync((s) => s.closeSettings)
  const status = useSync((s) => s.status)
  const lastError = useSync((s) => s.lastError)
  const savedUrl = useSync((s) => s.url)
  const savedToken = useSync((s) => s.token)
  const connect = useSync((s) => s.connect)
  const disconnect = useSync((s) => s.disconnect)
  const syncNow = useSync((s) => s.syncNow)
  const lastSyncedAt = useStore((s) => s.lastSyncedAt)
  const importLegacy = useStore((s) => s.importLegacy)

  const connected = status === 'idle' || status === 'syncing' || status === 'offline'

  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [imported, setImported] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setUrl(savedUrl ?? (typeof window !== 'undefined' ? window.location.origin : ''))
    setToken(savedToken ?? '')
    setImported(null)
  }, [open, savedUrl, savedToken])

  if (!open) return null

  const meta = STATUS_META[status]

  async function onConnect() {
    setBusy(true)
    await connect(url, token)
    setBusy(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot} ${meta.pulse ? 'animate-pulse' : ''}`} />
            <h2 className="text-sm font-semibold text-white">Sync &amp; devices</h2>
          </div>
          <button className="text-slate-500 hover:text-slate-200" onClick={close}>
            <Close width={18} height={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs leading-relaxed text-slate-400">
            Connect to your TargetGoals server to sync this browser with your other
            devices. Open <code className="text-slate-300">/pair</code> on the server to
            copy its URL and token. Your tasks stay on your own machine.
          </p>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Server URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-pc.tailnet.ts.net"
              disabled={connected}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="paste the token from /pair"
              disabled={connected}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-accent disabled:opacity-60"
            />
          </div>

          {lastError && status === 'error' && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {lastError}
            </div>
          )}

          <div className="flex items-center gap-2">
            {connected ? (
              <button
                className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
                onClick={disconnect}
              >
                Disconnect
              </button>
            ) : (
              <button
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                onClick={onConnect}
                disabled={busy || !url || !token}
              >
                {busy ? 'Connecting…' : 'Connect'}
              </button>
            )}
            <button
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-60"
              onClick={() => syncNow()}
              disabled={!connected}
            >
              Sync now
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-500">
            <span>Status: {meta.label}</span>
            {connected && <span>Last synced {relativeTime(lastSyncedAt)}</span>}
          </div>

          {hasLegacyData() && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-3">
              <div className="text-xs text-slate-400">
                Found tasks saved by an earlier version of this app on this device.
              </div>
              <button
                className="mt-2 text-xs font-semibold text-accent hover:underline"
                onClick={() => {
                  const n = importLegacy()
                  setImported(n)
                  if (useSync.getState().url) syncNow()
                }}
              >
                Import previous data
              </button>
              {imported !== null && (
                <span className="ml-2 text-xs text-emerald-400">Imported {imported} items</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
