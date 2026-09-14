/**
 * Remembers which study / scenario / baseline the user is working on, so the
 * app shell can always answer "what am I working on and which version?".
 */
import { create } from 'zustand';

interface WorkspaceState {
  activeStudyId: string | null;
  activeScenarioId: string | null;
  baselineScenarioId: string;
  setActiveStudy: (id: string | null) => void;
  setActiveScenario: (id: string | null) => void;
  setBaseline: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeStudyId: 'std-1001',
  activeScenarioId: 'scn-s1',
  baselineScenarioId: 'scn-s0',
  setActiveStudy: (id) => set({ activeStudyId: id }),
  setActiveScenario: (id) => set({ activeScenarioId: id }),
  setBaseline: (id) => set({ baselineScenarioId: id }),
}));
