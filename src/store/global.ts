import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Desktop navigation sidebar width bounds (px). 288 = w-72, the drawer
 *  width the sidebar evolved from. */
export const NAV_SIDEBAR_MIN_WIDTH = 224;
export const NAV_SIDEBAR_MAX_WIDTH = 480;
export const NAV_SIDEBAR_DEFAULT_WIDTH = 288;

export function clampNavSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) return NAV_SIDEBAR_DEFAULT_WIDTH;
  return Math.min(
    NAV_SIDEBAR_MAX_WIDTH,
    Math.max(NAV_SIDEBAR_MIN_WIDTH, Math.round(width))
  );
}

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
  /**
   * Desktop navigation sidebar (SectionNavSheet). Expanded by default on
   * desktop; below lg the sidebar is hidden and the hamburger opens the
   * slide-in drawer instead, so this flag only ever affects lg+ viewports.
   * Persisted (unlike the dialog flags) so the user's collapsed/expanded
   * choice and preferred width survive reloads — it is layout, not an
   * ephemeral dialog.
   */
  navSidebarOpen: boolean;
  /** Pixel width of the desktop navigation sidebar (clamped 224–480). */
  navSidebarWidth: number;
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
  setNavSidebarOpen: (open: boolean) => void;
  setNavSidebarWidth: (width: number) => void;
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
      // 288px = w-72, the drawer width the sidebar evolved from.
      navSidebarOpen: true,
      navSidebarWidth: 288,
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
      setNavSidebarOpen: (open) => set({ navSidebarOpen: open }),
      setNavSidebarWidth: (width) => set({ navSidebarWidth: clampNavSidebarWidth(width) }),
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
