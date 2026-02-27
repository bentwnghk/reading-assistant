import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalStore {
  openSetting: boolean;
  openHistory: boolean;
  hasOpenedAbout: boolean;
  openTutorChat: boolean;
  tutorChatSelectedText: string;
}

interface GlobalActions {
  setOpenSetting: (visible: boolean) => void;
  setOpenHistory: (visible: boolean) => void;
  setHasOpenedAbout: (value: boolean) => void;
  setOpenTutorChat: (visible: boolean) => void;
  setTutorChatSelectedText: (text: string) => void;
}

export const useGlobalStore = create(
  persist<GlobalStore & GlobalActions>(
    (set) => ({
      openSetting: false,
      openHistory: false,
      hasOpenedAbout: false,
      openTutorChat: false,
      tutorChatSelectedText: "",
      setOpenSetting: (visible) => set({ openSetting: visible }),
      setOpenHistory: (visible) => set({ openHistory: visible }),
      setHasOpenedAbout: (value) => set({ hasOpenedAbout: value }),
      setOpenTutorChat: (visible) => set({ openTutorChat: visible }),
      setTutorChatSelectedText: (text) => set({ tutorChatSelectedText: text }),
    }),
    { name: "global" }
  )
);
