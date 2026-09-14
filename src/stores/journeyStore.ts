import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { journey } from '@/app/journey';

interface JourneyState {
  /** guided mode is on by default so a first-time visitor is never lost */
  active: boolean;
  visited: string[];
  setActive: (value: boolean) => void;
  markVisited: (key: string) => void;
  reset: () => void;
  progressPct: () => number;
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
  active: true,
  visited: [],
  setActive: (value) => set({ active: value }),
  markVisited: (key) =>
    set((state) => (state.visited.includes(key) ? state : { visited: [...state.visited, key] })),
  reset: () => set({ visited: [] }),
      progressPct: () => Math.round((get().visited.length / journey.length) * 100),
    }),
    {
      name: 'tuip.journey',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ active: state.active, visited: state.visited }),
    },
  ),
);
