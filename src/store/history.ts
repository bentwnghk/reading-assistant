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
  syncToHistory: (readingStore: ReadingStore) => void;
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
        const history = get().history;
        const index = history.findIndex((item) => item.id === id);
        if (index === -1) return false;
        
        const newHistory = [...history];
        newHistory[index] = {
          ...clone(session),
          updatedAt: Date.now(),
        } as ReadingHistory;
        set(() => ({ history: newHistory }));
        return true;
      },
      remove: (id) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }));
        return true;
      },
      syncToHistory: (session) => {
        if (!session.id || !session.extractedText) return;
        
        const history = get().history;
        const index = history.findIndex((item) => item.id === session.id);
        if (index === -1) return;
        
        const newHistory = [...history];
        newHistory[index] = {
          ...clone(session),
          updatedAt: Date.now(),
        } as ReadingHistory;
        set(() => ({ history: newHistory }));
      },
    }),
    {
      name: "historyStore",
      version: 4,
      migrate: (persistedState, version) => {
        const state = persistedState as HistoryStore & HistoryActions;
        if (version < 3) {
          state.history = state.history?.map((item) => ({
            ...item,
            vocabularyQuizScore: item.vocabularyQuizScore ?? 0,
            glossaryRatings: item.glossaryRatings ?? {},
          })) || [];
        }
        if (version < 4) {
          state.history = state.history?.map((item) => ({
            ...item,
            analyzedSentences: item.analyzedSentences ?? {},
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
