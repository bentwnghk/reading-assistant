"use client";
import { create } from "zustand";
import { setAchievementUnlockCallback, type NewlyUnlockedAchievement } from "@/utils/activityLogger";

export interface AchievementMilestoneState {
  target: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface AchievementState {
  type: string;
  currentProgress: number;
  milestones: AchievementMilestoneState[];
  icon: string;
  color: string;
}

export interface AchievementsStoreState {
  achievements: AchievementState[];
  totalUnlocked: number;
  totalMilestones: number;
  loading: boolean;
  newlyUnlocked: NewlyUnlockedAchievement[];
  showUnlockDialog: boolean;
  pendingUnlocks: NewlyUnlockedAchievement[];
  fetchAchievements: () => Promise<void>;
  dismissUnlockDialog: () => void;
  showNextUnlock: () => void;
}

export const useAchievementsStore = create<AchievementsStoreState>((set, get) => ({
  achievements: [],
  totalUnlocked: 0,
  totalMilestones: 0,
  loading: false,
  newlyUnlocked: [],
  showUnlockDialog: false,
  pendingUnlocks: [],

  fetchAchievements: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/achievements");
      if (!res.ok) throw new Error("Failed to fetch achievements");
      const data = await res.json();
      set({
        achievements: data.achievements,
        totalUnlocked: data.totalUnlocked,
        totalMilestones: data.totalMilestones,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  dismissUnlockDialog: () => {
    const { pendingUnlocks } = get();
    if (pendingUnlocks.length > 1) {
      // More unlocks queued — show next after brief delay
      set({ pendingUnlocks: pendingUnlocks.slice(1), showUnlockDialog: false });
      setTimeout(() => {
        const { pendingUnlocks: remaining } = get();
        if (remaining.length > 0) {
          set({ newlyUnlocked: [remaining[0]], showUnlockDialog: true });
        }
      }, 400);
    } else {
      set({ showUnlockDialog: false, newlyUnlocked: [], pendingUnlocks: [] });
    }
  },

  showNextUnlock: () => {
    const { pendingUnlocks } = get();
    if (pendingUnlocks.length > 0) {
      set({ newlyUnlocked: [pendingUnlocks[0]], showUnlockDialog: true });
    }
  },
}));

// Wire up the activity logger callback so unlock dialogs fire automatically
// when any logActivity() call returns newly-unlocked achievements from the API.
export function initAchievementCallbacks() {
  setAchievementUnlockCallback((unlocked: NewlyUnlockedAchievement[]) => {
    if (!unlocked || unlocked.length === 0) return;

    const store = useAchievementsStore.getState();
    const allPending = [...store.pendingUnlocks, ...unlocked];

    if (!store.showUnlockDialog) {
      // Nothing showing right now — show first one immediately
      useAchievementsStore.setState({
        pendingUnlocks: allPending,
        newlyUnlocked: [allPending[0]],
        showUnlockDialog: true,
      });
    } else {
      // Queue them behind what's currently showing
      useAchievementsStore.setState({ pendingUnlocks: allPending });
    }

    // Refresh achievements data in background
    store.fetchAchievements();
  });
}
