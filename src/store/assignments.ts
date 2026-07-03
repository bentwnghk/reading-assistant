import { create } from "zustand";

interface AssignmentsStoreState {
  overdueCount: number;
}

interface AssignmentsStoreActions {
  fetchOverdueAssignmentCount: () => Promise<number>;
  resetOverdueCount: () => void;
}

export const useAssignmentsStore = create<
  AssignmentsStoreState & AssignmentsStoreActions
>()((set) => ({
  overdueCount: 0,

  fetchOverdueAssignmentCount: async () => {
    try {
      const res = await fetch("/api/assignments/overdue/count");
      if (!res.ok) {
        set({ overdueCount: 0 });
        return 0;
      }
      const data = await res.json();
      set({ overdueCount: data.count ?? 0 });
      return data.count ?? 0;
    } catch {
      set({ overdueCount: 0 });
      return 0;
    }
  },

  resetOverdueCount: () => set({ overdueCount: 0 }),
}));
