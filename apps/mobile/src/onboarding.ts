import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface OnboardingState {
  done: boolean
  hydrated: boolean
  finish: () => void
}

/** Tracks whether the one-time welcome has been shown. Kept separate from the
 * main store so it has no effect on task data. */
export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      done: false,
      hydrated: false,
      finish: () => set({ done: true }),
    }),
    {
      name: 'targetgoals-onboarding-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ done: s.done }),
      onRehydrateStorage: () => (state) => {
        // mark hydrated so we don't flash the modal before storage loads
        useOnboarding.setState({ hydrated: true })
        void state
      },
    },
  ),
)
