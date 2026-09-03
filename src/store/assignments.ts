import { create } from "zustand";

interface AssignmentsStoreState {
  pendingAssignmentCount: number;
}

interface AssignmentsStoreActions {
  fetchPendingAssignmentCount: () => Promise<number>;
  resetPendingAssignmentCount: () => void;
}

export const useAssignmentsStore = create<
  AssignmentsStoreState & AssignmentsStoreActions
>()((set) => ({
  pendingAssignmentCount: 0,

  fetchPendingAssignmentCount: async () => {
    try {
      const res = await fetch("/api/assignments/pending/count");
      if (!res.ok) {
        set({ pendingAssignmentCount: 0 });
        return 0;
      }
      const data = await res.json();
      set({ pendingAssignmentCount: data.count ?? 0 });
      return data.count ?? 0;
    } catch {
      set({ pendingAssignmentCount: 0 });
      return 0;
    }
  },

  resetPendingAssignmentCount: () => set({ pendingAssignmentCount: 0 }),
}));
