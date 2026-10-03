import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalStore {
  openSetting: boolean;
  openHistory: boolean;
  openDashboard: boolean;
  /** Optional tab to focus when the Dashboard dialog opens ("overview" | "sessions"). */
  dashboardInitialTab: string;
  hasOpenedAbout: boolean;
  /** Persisted only when the user completes setup (saves credentials, starts
   *  checkout, or jumps into Settings). Skip/dismiss is session-scope only. */
  hasCompletedOnboarding: boolean;
  /**
   * The last account that signed in on this browser profile. AuthProvider
   * compares it on every sign-in to detect account switches on shared
   * devices and reset account-scoped first-run state (onboarding flags,
   * stale persisted reading session) left behind by the previous user.
   */
  lastSignedInUserId: string;
  openTutorChat: boolean;
  tutorChatSelectedText: string;
  openTeacherDashboard: boolean;
}

interface GlobalActions {
  setOpenSetting: (visible: boolean) => void;
  setOpenHistory: (visible: boolean) => void;
  setOpenDashboard: (visible: boolean, initialTab?: string) => void;
  setDashboardInitialTab: (tab: string) => void;
  setHasOpenedAbout: (value: boolean) => void;
  setHasCompletedOnboarding: (value: boolean) => void;
  setOpenTutorChat: (visible: boolean) => void;
  setTutorChatSelectedText: (text: string) => void;
  setOpenTeacherDashboard: (visible: boolean) => void;
}

export const useGlobalStore = create(
  persist<GlobalStore & GlobalActions>(
    (set) => ({
      openSetting: false,
      openHistory: false,
      openDashboard: false,
      dashboardInitialTab: "",
      hasOpenedAbout: false,
      hasCompletedOnboarding: false,
      lastSignedInUserId: "",
      openTutorChat: false,
      tutorChatSelectedText: "",
      openTeacherDashboard: false,
      setOpenSetting: (visible) => set({ openSetting: visible }),
      setOpenHistory: (visible) => set({ openHistory: visible }),
      setOpenDashboard: (visible, initialTab) =>
        set(visible && initialTab
          ? { openDashboard: true, dashboardInitialTab: initialTab }
          : { openDashboard: visible }),
      setDashboardInitialTab: (tab) => set({ dashboardInitialTab: tab }),
      setHasOpenedAbout: (value) => set({ hasOpenedAbout: value }),
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
      setOpenTutorChat: (visible) => set({ openTutorChat: visible }),
      setTutorChatSelectedText: (text) => set({ tutorChatSelectedText: text }),
      setOpenTeacherDashboard: (visible) => set({ openTeacherDashboard: visible }),
    }),
    {
      name: "global",
      // Dialog visibility flags are session-ephemeral — persisting them lets
      // a dialog left open by a previous browser session (or a previous user
      // on a shared device) auto-open on the next boot.
      partialize: (state) => {
        const {
          openSetting: _openSetting,
          openHistory: _openHistory,
          openDashboard: _openDashboard,
          dashboardInitialTab: _dashboardInitialTab,
          openTutorChat: _openTutorChat,
          tutorChatSelectedText: _tutorChatSelectedText,
          openTeacherDashboard: _openTeacherDashboard,
          ...persistent
        } = state;
        return persistent as GlobalStore & GlobalActions;
      },
      // Neutralize dialog flags rehydrated from legacy localStorage entries
      // written before partialize existed (same pattern as store/reading.ts).
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.openSetting = false;
        state.openHistory = false;
        state.openDashboard = false;
        state.dashboardInitialTab = "";
        state.openTutorChat = false;
        state.tutorChatSelectedText = "";
        state.openTeacherDashboard = false;
      },
    }
  )
);
