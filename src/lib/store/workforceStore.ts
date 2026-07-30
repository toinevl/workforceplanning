import { create } from 'zustand';

interface WorkforceStore {
  isParametersPanelOpen: boolean;
  isSnapshotHistoryOpen: boolean;
  isPapertrailOpen: boolean;
  isDecisionSummaryOpen: boolean;
  isAISuggestionsOpen: boolean;
  selectedMemberId: string | null;
  toggleParametersPanel: () => void;
  setParametersPanelOpen: (open: boolean) => void;
  toggleSnapshotHistory: () => void;
  setSnapshotHistoryOpen: (open: boolean) => void;
  togglePapertrail: () => void;
  setPapertrailOpen: (open: boolean) => void;
  toggleDecisionSummary: () => void;
  setDecisionSummaryOpen: (open: boolean) => void;
  toggleAISuggestions: () => void;
  setAISuggestionsOpen: (open: boolean) => void;
  setSelectedMemberId: (id: string | null) => void;
}

export const useWorkforceStore = create<WorkforceStore>((set) => ({
  isParametersPanelOpen: false,
  isSnapshotHistoryOpen: false,
  isPapertrailOpen: false,
  isDecisionSummaryOpen: false,
  isAISuggestionsOpen: false,
  selectedMemberId: null,
  toggleParametersPanel: () =>
    set((s) => ({ isParametersPanelOpen: !s.isParametersPanelOpen })),
  setParametersPanelOpen: (open) => set({ isParametersPanelOpen: open }),
  toggleSnapshotHistory: () =>
    set((s) => ({ isSnapshotHistoryOpen: !s.isSnapshotHistoryOpen })),
  setSnapshotHistoryOpen: (open) => set({ isSnapshotHistoryOpen: open }),
  togglePapertrail: () =>
    set((s) => ({ isPapertrailOpen: !s.isPapertrailOpen })),
  setPapertrailOpen: (open) => set({ isPapertrailOpen: open }),
  toggleDecisionSummary: () =>
    set((s) => ({ isDecisionSummaryOpen: !s.isDecisionSummaryOpen })),
  setDecisionSummaryOpen: (open) => set({ isDecisionSummaryOpen: open }),
  toggleAISuggestions: () =>
    set((s) => ({ isAISuggestionsOpen: !s.isAISuggestionsOpen })),
  setAISuggestionsOpen: (open) => set({ isAISuggestionsOpen: open }),
  setSelectedMemberId: (id) => set({ selectedMemberId: id }),
}));
