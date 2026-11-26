import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LANGUAGE_CHECK_LEARN_DEFAULT_AGE } from "@/constants/languageCheck";
import { useLanguageCheckLearnStore } from "@/store/languageCheckLearn";
import { countWords } from "@/utils/languageCheck";
import type { FollowUpItem } from "@/utils/languageCheckFollowUpExport";
import type { PriorityHandout } from "@/utils/languageCheckLearn";

/**
 * Writing Assessment store — fully independent of the reading/history stores.
 *
 * Essays live in PostgreSQL (see /api/writing-assessment); this store is the
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
  /** Topic Library (lightweight; question images are fetched on demand). */
  topics: LanguageCheckTopicSummary[];
  topicsLoaded: boolean;
  topicsLoading: boolean;
  /** Library topic the next upload will be filed under (not persisted). */
  selectedTopicId: string | null;
  /** The essay currently open (full row incl. images), or null for the list view. */
  active: LanguageCheckEssay | null;
  activeLoading: boolean;
  /** Persisted UI preference. */
  explanationLanguage: ExplanationLanguage;
  /** Persisted preference: run a second OCR pass that reverts silent corrections. */
  verifyTranscription: boolean;
  /** Persisted learner age (8–18) that levels the "Learn from your mistakes" materials. The setup dialog re-defaults it from the Settings "Your Age" value (reading store `studentAge`) every time it opens. */
  learnAge: number;
  /** AI generation flags — store-level so spinners survive SPA navigation. */
  activeGenerations: Record<string, boolean>;
  /** Essay id the running generation belongs to. */
  generatingEssayId: string | null;
  progress: LanguageCheckProgress | null;
  /**
   * Generated follow-up worksheets, keyed by topic id and tied to the report's
   * `generatedAt` snapshot. Store-level (not persisted, §A) so the report
   * page's button stays a dropdown across SPA navigation; entries whose
   * `generatedAt` no longer matches the shown report are ignored.
   */
  followUpWorksheets: Record<string, { generatedAt: number; items: FollowUpItem[] }>;
  /**
   * Generated priority-card handouts, keyed by topic id and tied to the
   * report's `generatedAt` snapshot; inside each entry, handouts are keyed by
   * the priority's index on the report. Store-level (not persisted, §A) so
   * the per-card dropdowns survive SPA navigation; entries whose `generatedAt`
   * no longer match the shown report are ignored. The server keeps the
   * authoritative copy (hydrated on mount by the report page).
   */
  priorityHandouts: Record<string, { generatedAt: number; handouts: Record<string, PriorityHandout> }>;
}

interface LanguageCheckActions {
  setExplanationLanguage: (lang: ExplanationLanguage) => void;
  setVerifyTranscription: (on: boolean) => void;
  setLearnAge: (age: number) => void;
  setGenerating: (type: LanguageCheckGeneration, active: boolean) => void;
  setGeneratingEssayId: (id: string | null) => void;
  setProgress: (progress: LanguageCheckProgress | null) => void;
  /** Remember a generated worksheet so it can be re-downloaded without a new AI run. */
  cacheFollowUpWorksheet: (topicId: string, generatedAt: number, items: FollowUpItem[]) => void;
  /** Drop a cached worksheet (e.g. the report was regenerated). */
  clearFollowUpWorksheet: (topicId: string) => void;
  /** Remember a generated priority handout so its card can re-download without a new AI run. */
  cachePriorityHandout: (topicId: string, generatedAt: number, index: number, handout: PriorityHandout) => void;
  /** Drop a topic's cached priority handouts (e.g. the report was regenerated). */
  clearPriorityHandouts: (topicId: string) => void;
  loadList: (force?: boolean) => Promise<void>;
  loadTopics: (force?: boolean) => Promise<void>;
  selectTopic: (id: string | null) => void;
  /** Fetch one topic including its question image. */
  fetchTopic: (id: string) => Promise<LanguageCheckTopic>;
  saveTopic: (
    data: {
      title: string;
      topic: string;
      essayType: LanguageCheckEssayTypeId;
      questionImage: string;
      /** Class the topic is created for (null = personal). */
      classId: string | null;
    },
    id?: string,
  ) => Promise<LanguageCheckTopic>;
  removeTopic: (id: string) => Promise<void>;
  /**
   * Create an essay from staged pages. `studentId` (staff only) uploads on
   * the student's behalf — the returned essay is owned by them.
   */
  create: (
    images: string[],
    ocrModel: string,
    topicId: string,
    studentId?: string,
  ) => Promise<LanguageCheckEssay>;
  open: (id: string) => Promise<void>;
  close: () => void;
  /**
   * Staff remediation: transfer an essay the caller owns or uploaded to a
   * student in scope (PATCH /[id]/owner). Mirrors the new owner name into
   * the list summary and the open essay.
   */
  moveEssay: (id: string, studentId: string) => Promise<void>;
  /** In-memory edit of the open essay (no network). */
  updateLocal: (id: string, patch: Partial<LanguageCheckEssay>) => void;
  /** PATCH to the server and mirror into the open essay + list summary. */
  save: (id: string, patch: Partial<LanguageCheckEssay>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

const BASE = "/api/writing-assessment";

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

function toTopicSummary(t: LanguageCheckTopic): LanguageCheckTopicSummary {
  const { questionImage, ...rest } = t;
  return { ...rest, hasQuestionImage: questionImage !== "" };
}

function toSummary(e: LanguageCheckEssay): LanguageCheckEssaySummary {
  return {
    id: e.id,
    title: e.title,
    status: e.status,
    pageCount: e.images.length,
    errorCount: e.corrections.length,
    overall: e.assessment?.overall ?? null,
    wordCount: countWords(e.transcript),
    ownerId: e.ownerId,
    ownerName: e.ownerName,
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
  | "topics"
  | "topicsLoaded"
  | "topicsLoading"
  | "selectedTopicId"
  | "active"
  | "activeLoading"
  | "activeGenerations"
  | "generatingEssayId"
  | "progress"
  | "followUpWorksheets"
  | "priorityHandouts"
> = {
  essays: [],
  listLoaded: false,
  listLoading: false,
  topics: [],
  topicsLoaded: false,
  topicsLoading: false,
  selectedTopicId: null,
  active: null,
  activeLoading: false,
  activeGenerations: {},
  generatingEssayId: null,
  progress: null,
  followUpWorksheets: {},
  priorityHandouts: {},
};

export const useLanguageCheckStore = create(
  persist<
    LanguageCheckState & LanguageCheckActions,
    [],
    [],
    {
      explanationLanguage: ExplanationLanguage;
      verifyTranscription: boolean;
      learnAge: number;
    }
  >(
    (set, get) => ({
      ...initialData,
      explanationLanguage: "en",
      verifyTranscription: false,
      learnAge: LANGUAGE_CHECK_LEARN_DEFAULT_AGE,

      setExplanationLanguage: (explanationLanguage) => set({ explanationLanguage }),
      setVerifyTranscription: (verifyTranscription) => set({ verifyTranscription }),
      setLearnAge: (learnAge) => set({ learnAge }),

      setGenerating: (type, active) =>
        set((s) => ({
          activeGenerations: { ...s.activeGenerations, [type]: active },
        })),
      setGeneratingEssayId: (generatingEssayId) => set({ generatingEssayId }),
      setProgress: (progress) => set({ progress }),

      cacheFollowUpWorksheet: (topicId, generatedAt, items) =>
        set((s) => {
          // Re-insert last so the cap drops the least recently generated.
          const rest = { ...s.followUpWorksheets };
          delete rest[topicId];
          const keys = Object.keys(rest);
          if (keys.length >= 8) delete rest[keys[0]];
          return { followUpWorksheets: { ...rest, [topicId]: { generatedAt, items } } };
        }),

      clearFollowUpWorksheet: (topicId) =>
        set((s) => {
          if (!s.followUpWorksheets[topicId]) return {};
          const rest = { ...s.followUpWorksheets };
          delete rest[topicId];
          return { followUpWorksheets: rest };
        }),

      cachePriorityHandout: (topicId, generatedAt, index, handout) =>
        set((s) => {
          // Keep handouts generated from the same report snapshot; a mismatch
          // (stale local entry) starts a fresh map for the new snapshot.
          const prev = s.priorityHandouts[topicId];
          const handouts =
            prev && prev.generatedAt === generatedAt
              ? { ...prev.handouts, [String(index)]: handout }
              : { [String(index)]: handout };
          // Re-insert last so the cap drops the least recently generated.
          const rest = { ...s.priorityHandouts };
          delete rest[topicId];
          const keys = Object.keys(rest);
          if (keys.length >= 8) delete rest[keys[0]];
          return { priorityHandouts: { ...rest, [topicId]: { generatedAt, handouts } } };
        }),

      clearPriorityHandouts: (topicId) =>
        set((s) => {
          if (!s.priorityHandouts[topicId]) return {};
          const rest = { ...s.priorityHandouts };
          delete rest[topicId];
          return { priorityHandouts: rest };
        }),

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

      loadTopics: async (force = false) => {
        const { topicsLoaded, topicsLoading } = get();
        if (topicsLoading || (topicsLoaded && !force)) return;
        set({ topicsLoading: true });
        try {
          const res = await fetch(`${BASE}/topics`);
          if (!res.ok) throw new Error(await readError(res));
          const topics = (await res.json()) as LanguageCheckTopicSummary[];
          set({ topics, topicsLoaded: true });
        } finally {
          set({ topicsLoading: false });
        }
      },

      selectTopic: (selectedTopicId) => set({ selectedTopicId }),

      fetchTopic: async (id) => {
        const res = await fetch(`${BASE}/topics/${id}`);
        if (!res.ok) throw new Error(await readError(res));
        return (await res.json()) as LanguageCheckTopic;
      },

      saveTopic: async (data, id) => {
        const res = await fetch(id ? `${BASE}/topics/${id}` : `${BASE}/topics`, {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(await readError(res));
        const topic = (await res.json()) as LanguageCheckTopic;
        const summary = toTopicSummary(topic);
        set((s) => ({
          topics: [summary, ...s.topics.filter((x) => x.id !== topic.id)],
        }));
        // An edit can also drop the topic out of this library (an admin
        // making another user's class topic personal) or change where it
        // sorts, so re-sync with the server; the mirror above remains as the
        // fallback if that background refresh fails.
        if (id) get().loadTopics(true).catch(() => {});
        return topic;
      },

      removeTopic: async (id) => {
        const res = await fetch(`${BASE}/topics/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await readError(res));
        set((s) => ({
          topics: s.topics.filter((x) => x.id !== id),
          selectedTopicId: s.selectedTopicId === id ? null : s.selectedTopicId,
        }));
      },

      create: async (images, ocrModel, topicId, studentId) => {
        const res = await fetch(BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images, ocrModel, topicId, studentId }),
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

      moveEssay: async (id, studentId) => {
        const res = await fetch(`${BASE}/${id}/owner`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        });
        if (!res.ok) throw new Error(await readError(res));
        const owner = (await res.json()) as { ownerId: string; ownerName: string };
        set((s) => ({
          essays: s.essays.map((e) =>
            e.id === id
              ? { ...e, ownerId: owner.ownerId, ownerName: owner.ownerName }
              : e,
          ),
          active:
            s.active?.id === id
              ? { ...s.active, ownerId: owner.ownerId, ownerName: owner.ownerName }
              : s.active,
        }));
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
                      overall:
                        patch.assessment !== undefined
                          ? (patch.assessment?.overall ?? null)
                          : e.overall,
                      wordCount:
                        patch.transcript !== undefined
                          ? countWords(patch.transcript)
                          : e.wordCount,
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
        useLanguageCheckLearnStore.getState().reset();
        set({ ...initialData });
      },
    }),
    {
      name: "languageCheck",
      partialize: (state) => ({
        explanationLanguage: state.explanationLanguage,
        verifyTranscription: state.verifyTranscription,
        learnAge: state.learnAge,
      }),
    },
  ),
);
