import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalStore {
  openSetting: boolean;
  openHistory: boolean;
  openDashboard: boolean;
  hasOpenedAbout: boolean;
  openTutorChat: boolean;
  tutorChatSelectedText: string;
  openTeacherDashboard: boolean;
}

interface GlobalActions {
  setOpenSetting: (visible: boolean) => void;
  setOpenHistory: (visible: boolean) => void;
  setOpenDashboard: (visible: boolean) => void;
  setHasOpenedAbout: (value: boolean) => void;
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
      hasOpenedAbout: false,
      openTutorChat: false,
      tutorChatSelectedText: "",
      openTeacherDashboard: false,
      setOpenSetting: (visible) => set({ openSetting: visible }),
      setOpenHistory: (visible) => set({ openHistory: visible }),
      setOpenDashboard: (visible) => set({ openDashboard: visible }),
      setHasOpenedAbout: (value) => set({ hasOpenedAbout: value }),
      setOpenTutorChat: (visible) => set({ openTutorChat: visible }),
      setTutorChatSelectedText: (text) => set({ tutorChatSelectedText: text }),
      setOpenTeacherDashboard: (visible) => set({ openTeacherDashboard: visible }),
    }),
    { name: "global" }
  )
);
