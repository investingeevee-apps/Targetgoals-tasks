import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useStore } from '../store'
import { normalizeUrl, postSync, verifyConnection } from './api'

export type SyncStatus = 'disconnected' | 'connecting' | 'idle' | 'syncing' | 'error'

interface SyncState {
  url: string | null
  token: string | null
  status: SyncStatus
  lastError: string | null
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

      connect: async (rawUrl, rawToken) => {
        const url = normalizeUrl(rawUrl)
        const token = rawToken.trim()
        set({ status: 'connecting', lastError: null })
        try {
          await verifyConnection(url, token)
          set({ url, token, status: 'idle', lastError: null })
          await get().syncNow()
          return true
        } catch (e) {
          set({ status: 'error', lastError: (e as Error).message })
          return false
        }
      },

      disconnect: () => set({ url: null, token: null, status: 'disconnected', lastError: null }),

      syncNow: async () => {
        const { url, token } = get()
        if (!url || !token || inFlight) return
        inFlight = true
        set({ status: 'syncing' })
        try {
          const main = useStore.getState()
          const { changes, keys } = main.collectDirty()
          const res = await postSync(url, token, { since: main.lastSyncedAt, changes })
          useStore.getState().applyServerChanges(res.changes)
          useStore.getState().markSynced(res.now, keys)
          set({ status: 'idle', lastError: null })
        } catch (e) {
          set({ status: 'error', lastError: (e as Error).message })
        } finally {
          inFlight = false
        }
      },
    }),
    {
      name: 'targetgoals-mobile-conn-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ url: s.url, token: s.token }),
    },
  ),
)

let started = false

/** Auto-sync: on local edits (debounced), on a timer, and when the app foregrounds. */
export function initSync(): void {
  if (started) return
  started = true

  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = (delay = 800) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void useSync.getState().syncNow(), delay)
  }

  let prevDirty = Object.keys(useStore.getState().dirty).length
  useStore.subscribe((state) => {
    const count = Object.keys(state.dirty).length
    if (count > prevDirty) schedule(800)
    prevDirty = count
  })

  setInterval(() => void useSync.getState().syncNow(), 25_000)

  AppState.addEventListener('change', (s) => {
    if (s === 'active') void useSync.getState().syncNow()
  })

  if (useSync.getState().url && useSync.getState().token) schedule(400)
}
