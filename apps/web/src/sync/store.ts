import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useStore } from '../store'
import { normalizeUrl, postSync, verifyConnection } from './api'

export type SyncStatus =
  | 'disconnected'
  | 'connecting'
  | 'idle'
  | 'syncing'
  | 'error'
  | 'offline'

interface SyncState {
  url: string | null
  token: string | null
  status: SyncStatus
  lastError: string | null
  settingsOpen: boolean

  openSettings: () => void
  closeSettings: () => void
  connect: (url: string, token: string) => Promise<boolean>
  disconnect: () => void
  syncNow: () => Promise<void>
}

let inFlight = false

export const useSync = create<SyncState>()(
  persist(
    (set, get) => ({
      url: null,
      token: null,
      status: 'disconnected',
      lastError: null,
      settingsOpen: false,

      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),

      connect: async (rawUrl, rawToken) => {
        const url = normalizeUrl(rawUrl)
        const token = rawToken.trim()
        set({ status: 'connecting', lastError: null })
        try {
          await verifyConnection(url, token)
          set({ url, token, status: 'idle', lastError: null })
          // First-ever connection on this device: drop local example/seed data so
          // it doesn't duplicate the server's habits. Real offline edits (dirty)
          // are kept and pushed.
          const main = useStore.getState()
          if (main.lastSyncedAt === 0) main.dropUnsyncedSeeds()
          await get().syncNow()
          return true
        } catch (e) {
          set({ status: 'error', lastError: (e as Error).message })
          return false
        }
      },

      disconnect: () =>
        set({ url: null, token: null, status: 'disconnected', lastError: null }),

      syncNow: async () => {
        const { url, token } = get()
        if (!url || !token) return
        if (inFlight) return
        inFlight = true
        set({ status: 'syncing' })
        try {
          const main = useStore.getState()
          const { changes, synced } = main.collectDirty()
          const res = await postSync(url, token, { since: main.lastSyncedAt, changes })
          useStore.getState().applyServerChanges(res.changes)
          useStore.getState().markSynced(res.now, synced)
          set({ status: 'idle', lastError: null })
        } catch (e) {
          set({
            status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error',
            lastError: (e as Error).message,
          })
        } finally {
          inFlight = false
        }
      },
    }),
    {
      name: 'targetgoals-conn-v1',
      partialize: (s) => ({ url: s.url, token: s.token }),
    },
  ),
)

let started = false

/** Wire up auto-sync: on local edits (debounced), on a timer, and on reconnect. */
export function initSync(): void {
  if (started || typeof window === 'undefined') return
  started = true

  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = (delay = 800) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => useSync.getState().syncNow(), delay)
  }

  // sync shortly after a local edit (dirty set grows)
  let prevDirtyCount = Object.keys(useStore.getState().dirty).length
  useStore.subscribe((state) => {
    const count = Object.keys(state.dirty).length
    if (count > prevDirtyCount) schedule(800)
    prevDirtyCount = count
  })

  // periodic pull so remote changes show up
  setInterval(() => useSync.getState().syncNow(), 25_000)

  // reconnect handling
  window.addEventListener('online', () => useSync.getState().syncNow())
  window.addEventListener('offline', () => {
    if (useSync.getState().url) useSync.setState({ status: 'offline' })
  })

  // first sync if already configured (e.g. after reload)
  if (useSync.getState().url && useSync.getState().token) {
    schedule(300)
  }
}
