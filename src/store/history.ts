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
  save: (readingStore: ReadingStore) => Promise<string>;
  load: (id: string) => ReadingHistory | void;
  loadFull: (id: string) => Promise<ReadingHistory | void>;
  update: (id: string, readingStore: ReadingStore) => boolean;
  hydrate: (id: string, data: ReadingHistory) => void;
  remove: (id: string) => Promise<boolean>;
  syncToHistory: (readingStore: ReadingStore) => void;
  loadFromAPI: () => Promise<ReadingHistory[]>;
}

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 12);

let isAuthenticated = false;
let currentUserId: string | null = null;

export function setAuthState(authenticated: boolean, userId?: string | null) {
  isAuthenticated = authenticated;
  currentUserId = userId || null;
}

// Tracks which sessions in the history array already contain full media
// (originalImages + visualizationImage). Sessions loaded via loadFromAPI are
// lightweight; they are hydrated on demand by loadFull / hydrate.
const hydratedSessionIds = new Set<string>();
// Deduplicates concurrent loadFull fetches for the same session id.
const inflightFullFetches = new Map<string, Promise<ReadingHistory | void>>();

export const useHistoryStore = create(
  persist<HistoryStore & HistoryActions>(
    (set, get) => ({
      history: [],
      save: async (session) => {
        if (session.extractedText) {
          const id = session.id || nanoid();
          const newHistory: ReadingHistory = {
            ...clone(session),
            id,
            originalImages: session.originalImages || [],
            createdAt: session.createdAt || Date.now(),
          };
          
          if (isAuthenticated) {
            try {
              const response = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newHistory),
              });
              if (!response.ok) {
                console.error("Failed to save session to server");
              }
            } catch (error) {
              console.error("Failed to save session to server:", error);
            }
          }
          
          set((state) => ({ history: [newHistory, ...state.history] }));
          hydratedSessionIds.add(id);
          return id;
        }
        return "";
      },
      load: (id) => {
        const current = get().history.find((item) => item.id === id);
        if (current) return clone(current);
      },
      loadFull: async (id) => {
        const existing = get().history.find((item) => item.id === id);
        // Fast path: already hydrated with full media data.
        if (existing && hydratedSessionIds.has(id)) {
          return clone(existing);
        }
        // Deduplicate concurrent fetches for the same id.
        const inflight = inflightFullFetches.get(id);
        if (inflight) return inflight;
        const promise = (async () => {
          try {
            const response = await fetch(`/api/sessions/${id}`);
            if (response.ok) {
              const full = (await response.json()) as ReadingHistory;
              get().hydrate(id, full);
              const updated = get().history.find((item) => item.id === id);
              return updated ? clone(updated) : undefined;
            }
          } catch (error) {
            console.error("Failed to load full session:", error);
          }
          // Fallback to lightweight data if the fetch failed.
          return existing ? clone(existing) : undefined;
        })();
        inflightFullFetches.set(id, promise);
        try {
          return await promise;
        } finally {
          inflightFullFetches.delete(id);
        }
      },
      update: (id, session) => {
        const history = get().history;
        const index = history.findIndex((item) => item.id === id);
        if (index === -1) return false;
        
        const newHistory = [...history];
        newHistory[index] = {
          ...clone(session),
          originalImages: session.originalImages || [],
          updatedAt: Date.now(),
        } as ReadingHistory;
        set(() => ({ history: newHistory }));
        hydratedSessionIds.add(id);
        return true;
      },
      hydrate: (id, data) => {
        const history = get().history;
        const index = history.findIndex((item) => item.id === id);
        if (index === -1) return;
        const existing = history[index];
        const newHistory = [...history];
        // Replace the lightweight entry with the full data, but preserve the
        // original timestamps so the list order does not change.
        newHistory[index] = {
          ...clone(data),
          createdAt: existing.createdAt || data.createdAt,
          updatedAt: existing.updatedAt ?? data.updatedAt,
        } as ReadingHistory;
        set(() => ({ history: newHistory }));
        hydratedSessionIds.add(id);
      },
      remove: async (id) => {
        if (isAuthenticated) {
          try {
            const response = await fetch(`/api/sessions/${id}`, {
              method: "DELETE",
            });
            if (!response.ok) {
              console.error("Failed to delete session from server");
              return false;
            }
          } catch (error) {
            console.error("Failed to delete session from server:", error);
            return false;
          }
        }
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }));
        hydratedSessionIds.delete(id);
        return true;
      },
      syncToHistory: (session) => {
        if (!session.id || !session.extractedText) return;
        
        const history = get().history;
        const index = history.findIndex((item) => item.id === session.id);
        
        if (index === -1) {
          const newHistory: ReadingHistory = {
            ...clone(session),
            originalImages: session.originalImages || [],
            createdAt: session.createdAt || Date.now(),
            updatedAt: Date.now(),
          };
          set((state) => ({ history: [newHistory, ...state.history] }));
          hydratedSessionIds.add(session.id);
        } else {
          const newHistory = [...history];
          newHistory[index] = {
            ...clone(session),
            originalImages: session.originalImages || [],
            updatedAt: Date.now(),
          } as ReadingHistory;
          set(() => ({ history: newHistory }));
          hydratedSessionIds.add(session.id);
        }
      },
      loadFromAPI: async () => {
        if (!isAuthenticated || !currentUserId) return [];
        
        try {
          const response = await fetch("/api/sessions");
          if (response.ok) {
            const sessions = (await response.json()) as ReadingHistory[];
            set(() => ({ history: sessions }));
            // API sessions are lightweight (no media); reset hydration tracking.
            hydratedSessionIds.clear();
            inflightFullFetches.clear();
            return sessions;
          }
          return [];
        } catch (error) {
          console.error("Failed to load sessions from API:", error);
          return [];
        }
      },
    }),
    {
      name: "historyStore",
      version: 6,
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
        if (version < 5) {
          state.history = state.history?.map((item) => ({
            ...item,
            docTitle: item.docTitle ?? "",
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
          if (isAuthenticated) {
            return;
          }
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
