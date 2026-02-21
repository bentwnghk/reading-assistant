import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import type { ReadingStore } from "./reading";
import { readingStore } from "@/utils/storage";
import { customAlphabet } from "nanoid";
import { clone, pick } from "radash";

export type ReadingHistory = ReadingStore & {
  createdAt: number;
  updatedAt?: number;
};

export interface HistoryStore {
  history: ReadingHistory[];
}

interface HistoryActions {
  save: (readingStore: ReadingStore) => string;
  load: (id: string) => ReadingHistory | void;
  update: (id: string, readingStore: ReadingStore) => boolean;
  remove: (id: string) => boolean;
}

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 12);

export const useHistoryStore = create(
  persist<HistoryStore & HistoryActions>(
    (set, get) => ({
      history: [],
      save: (session) => {
        if (session.extractedText) {
          const id = session.id || nanoid();
          const newHistory: ReadingHistory = {
            ...clone(session),
            id,
            createdAt: session.createdAt || Date.now(),
          };
          set((state) => ({ history: [newHistory, ...state.history] }));
          return id;
        }
        return "";
      },
      load: (id) => {
        const current = get().history.find((item) => item.id === id);
        if (current) return clone(current);
      },
      update: (id, session) => {
        const newHistory = get().history.map((item) => {
          if (item.id === id) {
            return {
              ...clone(session),
              updatedAt: Date.now(),
            } as ReadingHistory;
          } else {
            return item;
          }
        });
        set(() => ({ history: [...newHistory] }));
        return true;
      },
      remove: (id) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }));
        return true;
      },
    }),
    {
      name: "historyStore",
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as HistoryStore & HistoryActions;
        if (version < 3) {
          state.history = state.history?.map((item) => ({
            ...item,
            vocabularyQuizScore: item.vocabularyQuizScore ?? 0,
            glossaryRatings: item.glossaryRatings ?? {},
          })) || [];
        }
        return state;
      },
      storage: {
        getItem: async (key: string) => {
          return await readingStore.getItem<
            StorageValue<HistoryStore & HistoryActions>
          >(key);
        },
        setItem: async (
          key: string,
          store: StorageValue<HistoryStore & HistoryActions>
        ) => {
          return await readingStore.setItem(key, {
            state: pick(store.state, ["history"]),
            version: store.version,
          });
        },
        removeItem: async (key: string) => await readingStore.removeItem(key),
      },
    }
  )
);
