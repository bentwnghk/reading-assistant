import { create } from "zustand";
import { calculateNextReview } from "@/utils/srs";

type SortField =
  | "word"
  | "rating"
  | "mastery"
  | "lastReviewed"
  | "createdAt";
type SortOrder = "asc" | "desc";

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
  pendingReviewListShares: SharedReviewList[];
  pendingReviewListShareCount: number;
  showReviewListShareDialog: boolean;
  acceptedReviewListWords: ReviewListWord[] | null;
  activeReviewListWordIds: Set<string> | null;
}

interface VocabularyStoreActions {
  fetchVocabulary: () => Promise<void>;
  setSelectedWordIds: (ids: Set<string>) => void;
  toggleWordSelection: (wordId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  autoSelectForReview: (
    count: number,
    strategy: VocabularySelectionStrategy
  ) => void;
  startReview: () => void;
  clearReviewQueue: () => void;
  recordSRSAction: (
    word: string,
    action: SRSAction
  ) => Promise<void>;
  updateWordReview: (
    word: string,
    correct: boolean
  ) => Promise<void>;
  setSearchQuery: (query: string) => void;
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
  pendingReviewListShares: [],
  pendingReviewListShareCount: 0,
  showReviewListShareDialog: false,
  acceptedReviewListWords: null,
  activeReviewListWordIds: null,

  fetchVocabulary: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/vocabulary");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      set({
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
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch vocabulary:", error);
      set({ isLoading: false });
    }
  },

  setSelectedWordIds: (ids) => set({ selectedWordIds: ids }),

  toggleWordSelection: (wordId) =>
    set((state) => {
      const next = new Set(state.selectedWordIds);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return { selectedWordIds: next };
    }),

  selectAll: () =>
    set((state) => ({
      selectedWordIds: new Set(state.words.map((w) => w.id)),
    })),

  clearSelection: () => set({ selectedWordIds: new Set(), reviewQueue: [] }),

  autoSelectForReview: (count, strategy) => {
    const { words, filterRating, filterMastery, filterSource } = get();
    const now = Date.now();
    let pool = [...words];

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

    const selected = pool.slice(0, count);
    set({ selectedWordIds: new Set(selected.map((w) => w.id)) });
  },

  startReview: () =>
    set((state) => {
      const queue = state.words.filter((w) =>
        state.selectedWordIds.has(w.id)
      );
      return { reviewQueue: queue };
    }),

  clearReviewQueue: () => set({ reviewQueue: [] }),

  recordSRSAction: async (word, action) => {
    const state = get();
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
    const existingWord = state.words.find(
      (w) => w.word.toLowerCase() === word.toLowerCase()
    );
    if (!existingWord) return;

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
    } catch (error) {
      console.error("Failed to update review:", error);
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
