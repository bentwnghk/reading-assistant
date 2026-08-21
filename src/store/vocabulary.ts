import { create } from "zustand";
import { calculateNextReview } from "@/utils/srs";

let _studyPlanDialogChecked = false;
export function setStudyPlanDialogChecked(value: boolean) {
  _studyPlanDialogChecked = value;
}
export function isStudyPlanDialogChecked() {
  return _studyPlanDialogChecked;
}

type SortField =
  | "word"
  | "rating"
  | "mastery"
  | "lastReviewed"
  | "createdAt";
type SortOrder = "asc" | "desc";

/**
 * Client-side mirror of getVocabularyStats (src/lib/vocabulary.ts) for
 * entry_type = 'word'. Keeping stats derived from `words` means the stats
 * cards update live after reviews (flashcard/quiz/spelling) without a
 * refetch, matching the phrase stats which are derived in the container.
 */
function computeWordStats(words: VocabularyWord[]): VocabularyStats {
  const now = Date.now();
  const pool = words.filter((w) => w.entryType !== "phrase");
  return {
    totalWords: pool.length,
    ownWords: pool.filter((w) => w.source === "own").length,
    teacherWords: pool.filter((w) => w.source === "teacher").length,
    dueForReview: pool.filter((w) => w.nextReviewAt === 0 || w.nextReviewAt <= now)
      .length,
    mastered: pool.filter((w) => w.masteryLevel === 5).length,
    newWords: pool.filter((w) => w.masteryLevel === 0 && w.reviewCount === 0)
      .length,
    hard: pool.filter((w) => w.rating === "hard").length,
    medium: pool.filter((w) => w.rating === "medium").length,
    easy: pool.filter((w) => w.rating === "easy").length,
    unrated: pool.filter((w) => w.rating === null).length,
  };
}

interface VocabularyStoreState {
  words: VocabularyWord[];
  stats: VocabularyStats;
  selectedWordIds: Set<string>;
  reviewQueue: VocabularyWord[];
  searchQuery: string;
  sortBy: SortField;
  sortOrder: SortOrder;
  filterRating: GlossaryRating | "all";
  filterMastery: "all" | "due" | "new" | "mastered";
  filterSource: "all" | "own" | "teacher";
  isLoading: boolean;
  dueForReviewCount: number;
  pendingReviewListShares: SharedReviewList[];
  pendingReviewListShareCount: number;
  showReviewListShareDialog: boolean;
  acceptedReviewListWords: ReviewListWord[] | null;
  activeReviewListWordIds: Set<string> | null;
  /** Non-null when a teacher/admin/super-admin is viewing a student's data (read-only). */
  viewingUserId: string | null;
  viewingUserName: string | null;
}

interface VocabularyStoreActions {
  fetchVocabulary: (userId?: string | null, userName?: string | null) => Promise<void>;
  setSelectedWordIds: (ids: Set<string>) => void;
  toggleWordSelection: (wordId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  autoSelectForReview: (
    count: number,
    strategy: VocabularySelectionStrategy,
    entryType?: "word" | "phrase"
  ) => void;
  startReview: () => void;
  setReviewQueue: (queue: VocabularyWord[]) => void;
  clearReviewQueue: () => void;
  recordSRSAction: (
    word: string,
    action: SRSAction
  ) => Promise<void>;
  updateWordReview: (
    word: string,
    correct: boolean
  ) => Promise<VocabularySrsOutcome | null>;
  setSearchQuery: (query: string) => void;
  fetchDueForReviewCount: () => Promise<void>;
  setSortBy: (sortBy: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  setFilterRating: (filter: GlossaryRating | "all") => void;
  setFilterMastery: (filter: "all" | "due" | "new" | "mastered") => void;
  setFilterSource: (filter: "all" | "own" | "teacher") => void;
  setPendingReviewListShares: (shares: SharedReviewList[] | ((prev: SharedReviewList[]) => SharedReviewList[])) => void;
  setPendingReviewListShareCount: (count: number) => void;
  setShowReviewListShareDialog: (open: boolean) => void;
  setAcceptedReviewListWords: (words: ReviewListWord[] | null) => void;
  fetchPendingReviewListShareCount: () => Promise<number>;
  loadReviewListIntoQueue: (words: ReviewListWord[]) => void;
  exitReviewList: () => void;
}

export const useVocabularyStore = create<
  VocabularyStoreState & VocabularyStoreActions
>((set, get) => ({
  words: [],
  stats: {
    totalWords: 0,
    ownWords: 0,
    teacherWords: 0,
    dueForReview: 0,
    mastered: 0,
    newWords: 0,
    hard: 0,
    medium: 0,
    easy: 0,
    unrated: 0,
  },
  selectedWordIds: new Set<string>(),
  reviewQueue: [],
  searchQuery: "",
  sortBy: "word",
  sortOrder: "asc",
  filterRating: "all",
  filterMastery: "all",
  filterSource: "all",
  isLoading: false,
  dueForReviewCount: 0,
  pendingReviewListShares: [],
  pendingReviewListShareCount: 0,
  showReviewListShareDialog: false,
  acceptedReviewListWords: null,
  activeReviewListWordIds: null,
  viewingUserId: null,
  viewingUserName: null,

  fetchVocabulary: async (userId, userName) => {
    set({ isLoading: true });
    try {
      const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const res = await fetch(`/api/vocabulary${qs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      set({
        viewingUserId: userId ?? null,
        viewingUserName: userId ? userName ?? null : null,
        words: data.words || [],
        stats: data.stats || {
          totalWords: 0,
          ownWords: 0,
          teacherWords: 0,
          dueForReview: 0,
          mastered: 0,
          newWords: 0,
          hard: 0,
          medium: 0,
          easy: 0,
          unrated: 0,
        },
        selectedWordIds: new Set(),
        reviewQueue: [],
        activeReviewListWordIds: null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch vocabulary:", error);
      set({ isLoading: false });
    }
  },

  fetchDueForReviewCount: async () => {
    try {
      const res = await fetch("/api/vocabulary?type=stats");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      set({ dueForReviewCount: data.dueForReview ?? 0 });
    } catch {
      set({ dueForReviewCount: 0 });
    }
  },

  setSelectedWordIds: (ids) => set({ selectedWordIds: ids }),

  toggleWordSelection: (wordId) =>
    set((state) => {
      if (state.viewingUserId) return {};
      const next = new Set(state.selectedWordIds);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return { selectedWordIds: next };
    }),

  selectAll: () =>
    set((state) => {
      if (state.viewingUserId) return {};
      return {
        selectedWordIds: new Set(
          state.words.filter((w) => w.entryType !== "phrase").map((w) => w.id)
        ),
      };
    }),

  clearSelection: () => set({ selectedWordIds: new Set(), reviewQueue: [] }),

  autoSelectForReview: (count, strategy, entryType = "word") => {
    const { words, filterRating, filterMastery, filterSource } = get();
    const now = Date.now();
    let pool =
      entryType === "phrase"
        ? words.filter((w) => w.entryType === "phrase")
        : words.filter((w) => w.entryType !== "phrase");

    if (filterRating !== "all") {
      pool = pool.filter((w) => w.rating === filterRating);
    }

    if (filterMastery === "due") {
      pool = pool.filter((w) => w.nextReviewAt === 0 || w.nextReviewAt <= now);
    } else if (filterMastery === "new") {
      pool = pool.filter((w) => w.masteryLevel === 0 && w.reviewCount === 0);
    } else if (filterMastery === "mastered") {
      pool = pool.filter((w) => w.masteryLevel === 5);
    }

    if (filterSource !== "all") {
      pool = pool.filter((w) => w.source === filterSource);
    }

    switch (strategy) {
      case "due":
        pool = pool.filter(
          (w) => w.nextReviewAt === 0 || w.nextReviewAt <= now
        );
        pool.sort((a, b) => a.nextReviewAt - b.nextReviewAt);
        break;
      case "hardest":
        pool = pool
          .filter((w) => w.rating === "hard")
          .sort((a, b) => a.masteryLevel - b.masteryLevel);
        break;
      case "newest":
        pool = pool
          .filter((w) => w.masteryLevel === 0 && w.reviewCount === 0)
          .sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "weakest": {
        pool = pool
          .filter((w) => w.reviewCount > 0)
          .sort((a, b) => {
            const ratioA = a.correctCount / a.reviewCount;
            const ratioB = b.correctCount / b.reviewCount;
            return ratioA - ratioB;
          });
        break;
      }
      case "random":
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        break;
    }

    const candidateSize = Math.min(pool.length, count * 3);
    const candidates = pool.slice(0, candidateSize);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const selected = candidates.slice(0, count);
    set({ selectedWordIds: new Set(selected.map((w) => w.id)) });
  },

  startReview: () =>
    set((state) => {
      const queue = state.words.filter((w) =>
        state.selectedWordIds.has(w.id)
      );
      return { reviewQueue: queue };
    }),

  setReviewQueue: (queue) => set({ reviewQueue: queue, selectedWordIds: new Set() }),

  clearReviewQueue: () => set({ reviewQueue: [] }),

  recordSRSAction: async (word, action) => {
    const state = get();
    if (state.viewingUserId) return;
    const existingWord = state.words.find(
      (w) => w.word.toLowerCase() === word.toLowerCase()
    );
    const wordData = existingWord
      ? {
          syllabification: existingWord.syllabification,
          partOfSpeech: existingWord.partOfSpeech,
          englishDefinition: existingWord.englishDefinition,
          chineseDefinition: existingWord.chineseDefinition,
          example: existingWord.example,
          source: existingWord.source,
          sharedBy: existingWord.sharedBy,
        }
      : null;
    try {
      const res = await fetch("/api/vocabulary/word", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, srsAction: action, wordData }),
      });
      const data = await res.json();
      set((state) => ({
        words: state.words.map((w) =>
          w.word.toLowerCase() === word.toLowerCase()
            ? {
                ...w,
                rating: data.rating,
                srsCounts: data.srsCounts,
                id: data.id || w.id,
                source: data.source || w.source,
                updatedAt: Date.now(),
              }
            : w
        ),
      }));
    } catch (error) {
      console.error("Failed to record SRS action:", error);
    }
  },

  updateWordReview: async (word, correct) => {
    const state = get();
    if (state.viewingUserId) return null;
    const existingWord = state.words.find(
      (w) => w.word.toLowerCase() === word.toLowerCase()
    );
    if (!existingWord) return null;

    const { newMastery, nextReviewAt } = calculateNextReview(
      existingWord.masteryLevel,
      correct
    );

    try {
      await fetch("/api/vocabulary/word", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          correct,
          masteryLevel: newMastery,
          nextReviewAt,
        }),
      });

      const now = Date.now();
      set((state) => ({
        words: state.words.map((w) =>
          w.word.toLowerCase() === word.toLowerCase()
            ? {
                ...w,
                masteryLevel: newMastery,
                nextReviewAt,
                reviewCount: w.reviewCount + 1,
                correctCount: w.correctCount + (correct ? 1 : 0),
                lastReviewedAt: now,
                updatedAt: now,
              }
            : w
        ),
      }));
      // Outcome for the games' "spaced repetition updated" result card.
      return { word, correct, newMastery, nextReviewAt };
    } catch (error) {
      console.error("Failed to update review:", error);
      return null;
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setFilterRating: (filter) => set({ filterRating: filter }),
  setFilterMastery: (filter) => set({ filterMastery: filter }),
  setFilterSource: (filter) => set({ filterSource: filter }),

  setPendingReviewListShares: (shares) =>
    set((state) => {
      const resolved = typeof shares === "function" ? shares(state.pendingReviewListShares) : shares;
      return { pendingReviewListShares: resolved, pendingReviewListShareCount: resolved.length };
    }),
  setPendingReviewListShareCount: (count) =>
    set({ pendingReviewListShareCount: count }),
  setShowReviewListShareDialog: (open) =>
    set({ showReviewListShareDialog: open }),
  setAcceptedReviewListWords: (words) =>
    set({ acceptedReviewListWords: words }),

  fetchPendingReviewListShareCount: async () => {
    try {
      const res = await fetch("/api/review-lists/share/pending?count=1");
      if (!res.ok) {
        set({ pendingReviewListShareCount: 0 });
        return 0;
      }
      const data = await res.json();
      set({ pendingReviewListShareCount: data.count ?? 0 });
      return data.count ?? 0;
    } catch {
      set({ pendingReviewListShareCount: 0 });
      return 0;
    }
  },

  loadReviewListIntoQueue: (words) => {
    const now = Date.now();
    const queue: VocabularyWord[] = words.map((w, i) => ({
      id: `review-list-${i}-${now}`,
      word: w.word,
      syllabification: w.syllabification || "",
      partOfSpeech: w.partOfSpeech || "",
      englishDefinition: w.englishDefinition || "",
      chineseDefinition: w.chineseDefinition || "",
      example: w.example || "",
      rating: null,
      srsCounts: { hard: 0, medium: 0 },
      masteryLevel: 0,
      reviewCount: 0,
      correctCount: 0,
      lastReviewedAt: 0,
      nextReviewAt: 0,
      sourceSessionIds: [],
      source: "own" as VocabularySource,
      entryType: w.entryType ?? (w.word.trim().includes(" ") ? "phrase" : "word"),
      sharedBy: null,
      createdAt: now,
      updatedAt: now,
    }));
    set((state) => {
      const existingIds = new Set(state.words.map((w) => w.id));
      const wordToExistingId = new Map(
        state.words.map((w) => [w.word.toLowerCase(), w.id])
      );
      const added = queue.filter(
        (w) => !existingIds.has(w.id) && !wordToExistingId.has(w.word.toLowerCase())
      );
      const activeIds = new Set<string>();
      for (const w of queue) {
        const existingId = wordToExistingId.get(w.word.toLowerCase());
        if (existingId) {
          activeIds.add(existingId);
        } else {
          activeIds.add(w.id);
        }
      }
      return {
        words: [...state.words, ...added],
        reviewQueue: queue,
        selectedWordIds: activeIds,
        activeReviewListWordIds: activeIds,
        acceptedReviewListWords: null,
      };
    });
  },

  exitReviewList: () =>
    set({
      activeReviewListWordIds: null,
      reviewQueue: [],
      selectedWordIds: new Set(),
    }),
}));

// Keep stats derived from words so any mutation (recordSRSAction,
// updateWordReview, loadReviewListIntoQueue, fetchVocabulary, ...) updates
// the stats cards live. Setting stats here does not touch words, so the
// listener re-entry is a no-op (words reference is unchanged).
useVocabularyStore.subscribe((state, prev) => {
  if (state.words !== prev.words) {
    useVocabularyStore.setState({ stats: computeWordStats(state.words) });
  }
});
