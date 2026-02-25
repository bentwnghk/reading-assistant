import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalStore {
  openSetting: boolean;
  openHistory: boolean;
  hasOpenedAbout: boolean;
}

interface GlobalActions {
  setOpenSetting: (visible: boolean) => void;
  setOpenHistory: (visible: boolean) => void;
  setHasOpenedAbout: (value: boolean) => void;
}

export const useGlobalStore = create(
  persist<GlobalStore & GlobalActions>(
    (set) => ({
      openSetting: false,
      openHistory: false,
      hasOpenedAbout: false,
      setOpenSetting: (visible) => set({ openSetting: visible }),
      setOpenHistory: (visible) => set({ openHistory: visible }),
      setHasOpenedAbout: (value) => set({ hasOpenedAbout: value }),
    }),
    { name: "global" }
  )
);
