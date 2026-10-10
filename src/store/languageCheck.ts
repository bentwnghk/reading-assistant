import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Language Check store — fully independent of the reading/history stores.
 *
 * Essays live in PostgreSQL (see /api/language-check); this store is the
 * client cache + generation state. Only the explanation-language preference is
 * persisted locally. Everything that must survive SPA navigation (generation
 * flags, abort controllers, the essay being processed) is module/store scoped
 * (AGENTS Architectural Rules §A).
 */

export type ExplanationLanguage = "en" | "zh";

export type LanguageCheckGeneration = "ocr" | "language-check";

export interface LanguageCheckProgress {
  current: number;
  total: number;
}

interface LanguageCheckState {
  essays: LanguageCheckEssaySummary[];
  listLoaded: boolean;
  listLoading: boolean;
  /** The essay currently open (full row incl. images), or null for the list view. */
  active: LanguageCheckEssay | null;
  activeLoading: boolean;
  /** Persisted UI preference. */
  explanationLanguage: ExplanationLanguage;
  /** Persisted preference: run a second OCR pass that reverts silent corrections. */
  verifyTranscription: boolean;
  /** AI generation flags — store-level so spinners survive SPA navigation. */
  activeGenerations: Record<string, boolean>;
  /** Essay id the running generation belongs to. */
  generatingEssayId: string | null;
  progress: LanguageCheckProgress | null;
}

interface LanguageCheckActions {
  setExplanationLanguage: (lang: ExplanationLanguage) => void;
  setVerifyTranscription: (on: boolean) => void;
  setGenerating: (type: LanguageCheckGeneration, active: boolean) => void;
  setGeneratingEssayId: (id: string | null) => void;
  setProgress: (progress: LanguageCheckProgress | null) => void;
  loadList: (force?: boolean) => Promise<void>;
  create: (images: string[], ocrModel: string) => Promise<LanguageCheckEssay>;
  open: (id: string) => Promise<void>;
  close: () => void;
  /** In-memory edit of the open essay (no network). */
  updateLocal: (id: string, patch: Partial<LanguageCheckEssay>) => void;
  /** PATCH to the server and mirror into the open essay + list summary. */
  save: (id: string, patch: Partial<LanguageCheckEssay>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

const BASE = "/api/language-check";

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

function toSummary(e: LanguageCheckEssay): LanguageCheckEssaySummary {
  return {
    id: e.id,
    title: e.title,
    status: e.status,
    pageCount: e.images.length,
    errorCount: e.corrections.length,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

let openToken = 0;

// ── Abort registry (module scope: survives component unmount) ────────────────
const controllers = new Map<LanguageCheckGeneration, AbortController>();

export function getLanguageCheckAbort(
  type: LanguageCheckGeneration,
): AbortController {
  let c = controllers.get(type);
  if (!c || c.signal.aborted) {
    c = new AbortController();
    controllers.set(type, c);
  }
  return c;
}

export function removeLanguageCheckAbort(type: LanguageCheckGeneration): void {
  controllers.delete(type);
}

export function abortLanguageCheck(type?: LanguageCheckGeneration): void {
  for (const [key, c] of controllers) {
    if ((!type || key === type) && !c.signal.aborted) c.abort();
  }
}

const initialData: Pick<
  LanguageCheckState,
  | "essays"
  | "listLoaded"
  | "listLoading"
  | "active"
  | "activeLoading"
  | "activeGenerations"
  | "generatingEssayId"
  | "progress"
> = {
  essays: [],
  listLoaded: false,
  listLoading: false,
  active: null,
  activeLoading: false,
  activeGenerations: {},
  generatingEssayId: null,
  progress: null,
};

export const useLanguageCheckStore = create(
  persist<
    LanguageCheckState & LanguageCheckActions,
    [],
    [],
    { explanationLanguage: ExplanationLanguage; verifyTranscription: boolean }
  >(
    (set, get) => ({
      ...initialData,
      explanationLanguage: "en",
      verifyTranscription: false,

      setExplanationLanguage: (explanationLanguage) => set({ explanationLanguage }),
      setVerifyTranscription: (verifyTranscription) => set({ verifyTranscription }),

      setGenerating: (type, active) =>
        set((s) => ({
          activeGenerations: { ...s.activeGenerations, [type]: active },
        })),
      setGeneratingEssayId: (generatingEssayId) => set({ generatingEssayId }),
      setProgress: (progress) => set({ progress }),

      loadList: async (force = false) => {
        const { listLoaded, listLoading } = get();
        if (listLoading || (listLoaded && !force)) return;
        set({ listLoading: true });
        try {
          const res = await fetch(BASE);
          if (!res.ok) throw new Error(await readError(res));
          const essays = (await res.json()) as LanguageCheckEssaySummary[];
          set({ essays, listLoaded: true });
        } finally {
          set({ listLoading: false });
        }
      },

      create: async (images, ocrModel) => {
        const res = await fetch(BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images, ocrModel }),
        });
        if (!res.ok) throw new Error(await readError(res));
        const essay = (await res.json()) as LanguageCheckEssay;
        set((s) => ({
          active: essay,
          essays: [toSummary(essay), ...s.essays],
        }));
        return essay;
      },

      open: async (id) => {
        if (get().active?.id === id) return;
        const token = ++openToken;
        set({ activeLoading: true });
        try {
          const res = await fetch(`${BASE}/${id}`);
          if (!res.ok) throw new Error(await readError(res));
          const essay = (await res.json()) as LanguageCheckEssay;
          // Ignore a stale response if another essay was opened/closed meanwhile.
          if (token === openToken) set({ active: essay });
        } finally {
          if (token === openToken) set({ activeLoading: false });
        }
      },

      close: () => {
        openToken++;
        set({ active: null, activeLoading: false });
      },

      updateLocal: (id, patch) =>
        set((s) =>
          s.active?.id === id ? { active: { ...s.active, ...patch } } : {},
        ),

      save: async (id, patch) => {
        const {
          id: _id,
          images: _images,
          createdAt: _c,
          updatedAt: _u,
          ...payload
        } = patch;
        const res = await fetch(`${BASE}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await readError(res));
        set((s) => {
          const active =
            s.active?.id === id ? { ...s.active, ...patch } : s.active;
          const now = Date.now();
          return {
            active,
            essays: s.essays
              .map((e) =>
                e.id === id
                  ? {
                      ...e,
                      title: patch.title ?? e.title,
                      status: patch.status ?? e.status,
                      errorCount: patch.corrections
                        ? patch.corrections.length
                        : e.errorCount,
                      updatedAt: now,
                    }
                  : e,
              )
              .sort((a, b) => b.updatedAt - a.updatedAt),
          };
        });
      },

      remove: async (id) => {
        const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await readError(res));
        set((s) => ({
          essays: s.essays.filter((e) => e.id !== id),
          active: s.active?.id === id ? null : s.active,
        }));
      },

      // Called on sign-out / account switch so one account's essays never
      // show for the next on a shared device.
      reset: () => {
        abortLanguageCheck();
        set({ ...initialData });
      },
    }),
    {
      name: "languageCheck",
      partialize: (state) => ({
        explanationLanguage: state.explanationLanguage,
        verifyTranscription: state.verifyTranscription,
      }),
    },
  ),
);
