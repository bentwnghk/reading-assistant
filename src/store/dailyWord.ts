import { create } from "zustand";
import { toast } from "sonner";
import { useSettingStore } from "@/store/setting";
import { generateSignature } from "@/utils/signature";
import type { z } from "zod";
import type { dailyWordContentSchema } from "@/lib/daily-word-schema";
import { parseError } from "@/utils/error";

export type DailyWordContent = z.infer<typeof dailyWordContentSchema>;
export type DailyWordImageKind = "mascot" | "scene";

export interface DailyWordDay {
  word: string;
  learnedAt: number | null;
  onTime: boolean;
  note: string;
}

export const contentKey = (word: string) => word.trim().toLowerCase();
const imageKey = (word: string, kind: DailyWordImageKind) =>
  `${contentKey(word)}:${kind}`;

interface DailyWordState {
  days: Record<string, DailyWordDay>;
  loaded: boolean;
  content: Record<string, DailyWordContent>;
  images: Record<string, string>;
  /** Keys whose image generation is running or failed (drives spinners). */
  imageStatus: Record<string, "loading" | "failed">;
  load: () => Promise<void>;
  pin: (dayKey: string, word: string) => void;
  learn: (dayKey: string, word: string, onTime: boolean) => Promise<void>;
  setNote: (dayKey: string, word: string, note: string) => void;
  flushNotes: () => Promise<void>;
  setContent: (word: string, content: DailyWordContent) => void;
  loadWordAssets: (word: string) => Promise<DailyWordContent | null>;
  ensureImage: (word: string, kind: DailyWordImageKind) => Promise<void>;
  reset: () => void;
}

// Module scope (architecture rule A): survives SPA navigation / dialog unmount.
let loadPromise: Promise<void> | null = null;
const assetsLoaded = new Set<string>();
const imageInflight = new Map<string, Promise<void>>();
const pinInflight = new Set<string>();
const pendingNotes = new Map<string, { dayKey: string; word: string; note: string }>();
let noteTimer: ReturnType<typeof setTimeout> | null = null;
let epoch = 0;

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(typeof body.error === "string" ? body.error : `HTTP ${res.status}`), {
      status: res.status,
    });
  }
  return res.json();
}

export const useDailyWordStore = create<DailyWordState>()((set, get) => ({
  days: {},
  loaded: false,
  content: {},
  images: {},
  imageStatus: {},

  load: () => {
    if (get().loaded) return Promise.resolve();
    if (!loadPromise) {
      const mine = epoch;
      loadPromise = api("/api/vocabulary/daily-word")
        .then((d) => {
          if (mine !== epoch) return;
          // Keep optimistic local edits made while the request was in flight.
          set((s) => ({ days: { ...d.days, ...s.days }, loaded: true }));
        })
        .catch(() => {
          // Offline / signed out: the card still works for today, unsynced.
        })
        .finally(() => {
          loadPromise = null;
        });
    }
    return loadPromise;
  },

  pin: (dayKey, word) => {
    const existing = get().days[dayKey];
    if (existing || pinInflight.has(dayKey)) return;
    pinInflight.add(dayKey);
    set((s) => ({
      days: { ...s.days, [dayKey]: { word, learnedAt: null, onTime: false, note: "" } },
    }));
    const mine = epoch;
    api("/api/vocabulary/daily-word", {
      method: "POST",
      body: JSON.stringify({ action: "pin", dayKey, word }),
    })
      .then((r) => {
        if (mine === epoch) set((s) => ({ days: { ...s.days, [dayKey]: r.day } }));
      })
      .catch(() => {})
      .finally(() => pinInflight.delete(dayKey));
  },

  learn: async (dayKey, word, onTime) => {
    if (get().days[dayKey]?.learnedAt) return;
    const prev = get().days[dayKey];
    set((s) => ({
      days: {
        ...s.days,
        [dayKey]: { word, note: prev?.note ?? "", learnedAt: Date.now(), onTime },
      },
    }));
    const mine = epoch;
    try {
      const r = await api("/api/vocabulary/daily-word", {
        method: "POST",
        body: JSON.stringify({ action: "learn", dayKey, word, onTime }),
      });
      if (mine === epoch) set((s) => ({ days: { ...s.days, [dayKey]: r.day } }));
    } catch (e) {
      if (mine !== epoch) return;
      // Roll back so the user can retry instead of believing it was saved.
      set((s) => {
        const days = { ...s.days };
        if (prev) days[dayKey] = prev;
        else delete days[dayKey];
        return { days };
      });
      toast.error(parseError(e));
      throw e;
    }
  },

  setNote: (dayKey, word, note) => {
    set((s) => {
      const d = s.days[dayKey];
      return {
        days: {
          ...s.days,
          [dayKey]: { word, learnedAt: d?.learnedAt ?? null, onTime: d?.onTime ?? false, note },
        },
      };
    });
    pendingNotes.set(dayKey, { dayKey, word, note });
    if (noteTimer) clearTimeout(noteTimer);
    noteTimer = setTimeout(() => void get().flushNotes(), 800);
  },

  flushNotes: async () => {
    if (noteTimer) clearTimeout(noteTimer);
    noteTimer = null;
    const batch = [...pendingNotes.values()];
    pendingNotes.clear();
    await Promise.all(
      batch.map((n) =>
        api("/api/vocabulary/daily-word", {
          method: "POST",
          body: JSON.stringify({ action: "note", ...n }),
        }).catch(() => {})
      )
    );
  },

  setContent: (word, content) =>
    set((s) => ({ content: { ...s.content, [contentKey(word)]: content } })),

  loadWordAssets: async (word) => {
    const key = contentKey(word);
    const have = get().content[key];
    if (have && assetsLoaded.has(key)) return have;
    try {
      const r = await api(`/api/vocabulary/daily-word/content?word=${encodeURIComponent(word)}`);
      assetsLoaded.add(key);
      set((s) => {
        const images = { ...s.images };
        for (const [kind, img] of Object.entries(r.images ?? {})) {
          images[imageKey(word, kind as DailyWordImageKind)] = img as string;
        }
        return {
          images,
          content: r.content ? { ...s.content, [key]: r.content } : s.content,
        };
      });
      return (r.content as DailyWordContent | null) ?? get().content[key] ?? null;
    } catch {
      return get().content[key] ?? null;
    }
  },

  ensureImage: (word, kind) => {
    const key = imageKey(word, kind);
    if (get().images[key]) return Promise.resolve();
    const running = imageInflight.get(key);
    if (running) return running;
    if (get().imageStatus[key] === "failed") return Promise.resolve();

    set((s) => ({ imageStatus: { ...s.imageStatus, [key]: "loading" } }));
    const mine = epoch;
    const { mode, accessPassword, imageModel } = useSettingStore.getState();
    const headers: Record<string, string> = {};
    if (mode === "proxy") {
      headers["x-access-signature"] = generateSignature(accessPassword, Date.now());
    }
    const p = api("/api/vocabulary/daily-word/image", {
      method: "POST",
      headers,
      body: JSON.stringify({ word, kind, mode, imageModel }),
    })
      .then((r) => {
        if (mine !== epoch) return;
        set((s) => {
          const imageStatus = { ...s.imageStatus };
          delete imageStatus[key];
          return { images: { ...s.images, [key]: r.image }, imageStatus };
        });
      })
      .catch((e: { status?: number }) => {
        if (mine !== epoch) return;
        // 429/403 are not worth retrying this session; the emoji stays.
        set((s) => ({ imageStatus: { ...s.imageStatus, [key]: "failed" } }));
        void e;
      })
      .finally(() => imageInflight.delete(key));
    imageInflight.set(key, p);
    return p;
  },

  reset: () => {
    epoch++;
    loadPromise = null;
    assetsLoaded.clear();
    imageInflight.clear();
    pinInflight.clear();
    pendingNotes.clear();
    if (noteTimer) clearTimeout(noteTimer);
    noteTimer = null;
    set({ days: {}, loaded: false, content: {}, images: {}, imageStatus: {} });
  },
}));

export const imageStoreKey = imageKey;
