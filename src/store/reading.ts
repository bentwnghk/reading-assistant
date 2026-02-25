import { create } from "zustand";
import { persist } from "zustand/middleware";
import { pick } from "radash";
import { nanoid } from "nanoid";
import { readingImagesStore } from "@/utils/storage";

let syncToHistoryFn: ((store: ReadingStore) => void) | null = null;

export function setHistorySyncFn(fn: (store: ReadingStore) => void) {
  syncToHistoryFn = fn;
}

function syncToHistoryIfNeeded(state: ReadingStore) {
  if (syncToHistoryFn && state.id && state.extractedText) {
    syncToHistoryFn(state);
  }
}

export type ReadingStatus =
  | "idle"
  | "extracting"
  | "summarizing"
  | "adapting"
  | "simplifying"
  | "mindmap"
  | "testing"
  | "glossary"
  | "error";

type ReadingTestMode = "all-at-once" | "question-by-question";

export interface ReadingStore {
  id: string;
  docTitle: string;
  studentAge: number;
  originalImages: string[];
  extractedText: string;
  summary: string;
  adaptedText: string;
  simplifiedText: string;
  highlightedWords: string[];
  analyzedSentences: Record<string, SentenceAnalysis>;
  mindMap: string;
  readingTest: ReadingTestQuestion[];
  glossary: GlossaryEntry[];
  glossaryRatings: Record<string, GlossaryRating>;
  testScore: number;
  testCompleted: boolean;
  testEarnedPoints: number;
  testTotalPoints: number;
  testShowChinese: boolean;
  testMode: ReadingTestMode;
  vocabularyQuizScore: number;
  spellingGameBestScore: number;
  status: ReadingStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

interface ReadingActions {
  setDocTitle: (title: string) => void;
  setStudentAge: (age: number) => void;
  setOriginalImages: (images: string[]) => void;
  addOriginalImage: (image: string) => void;
  removeOriginalImage: (index: number) => void;
  setExtractedText: (text: string) => void;
  setSummary: (summary: string) => void;
  setAdaptedText: (text: string) => void;
  setSimplifiedText: (text: string) => void;
  addHighlightedWord: (word: string) => void;
  removeHighlightedWord: (word: string) => void;
  setHighlightedWords: (words: string[]) => void;
  setSentenceAnalysis: (sentence: string, analysis: string) => void;
  removeSentenceAnalysis: (sentence: string) => void;
  getSentenceAnalysis: (sentence: string) => SentenceAnalysis | null;
  setMindMap: (mermaidCode: string) => void;
  setReadingTest: (questions: ReadingTestQuestion[]) => void;
  setUserAnswer: (questionId: string, answer: string) => void;
  setQuestionEarnedPoints: (questionId: string, points: number) => void;
  setGlossary: (entries: GlossaryEntry[]) => void;
  setGlossaryRating: (word: string, rating: GlossaryRating) => void;
  setTestScore: (score: number) => void;
  setTestCompleted: (completed: boolean) => void;
  setTestPoints: (earned: number, total: number) => void;
  setTestShowChinese: (show: boolean) => void;
  setTestMode: (mode: ReadingTestMode) => void;
  setVocabularyQuizScore: (score: number) => void;
  setSpellingGameBestScore: (score: number) => void;
  setStatus: (status: ReadingStatus) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  backup: () => ReadingStore;
  restore: (session: ReadingStore) => void;
}

const defaultValues: ReadingStore = {
  id: "",
  docTitle: "",
  studentAge: 13,
  originalImages: [],
  extractedText: "",
  summary: "",
  adaptedText: "",
  simplifiedText: "",
  highlightedWords: [],
  analyzedSentences: {},
  mindMap: "",
  readingTest: [],
  glossary: [],
  glossaryRatings: {},
  testScore: 0,
  testCompleted: false,
  testEarnedPoints: 0,
  testTotalPoints: 0,
  testShowChinese: false,
  testMode: "all-at-once",
  vocabularyQuizScore: 0,
  spellingGameBestScore: 0,
  status: "idle",
  error: null,
  createdAt: 0,
  updatedAt: 0,
};

export const useReadingStore = create(
  persist<ReadingStore & ReadingActions>(
    (set, get) => ({
      ...defaultValues,
      setDocTitle: (title) =>
        set((state) => {
          const newState = {
            docTitle: title,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          return newState;
        }),
      setStudentAge: (age) =>
        set(() => ({
          studentAge: Math.max(8, Math.min(18, age)),
          updatedAt: Date.now(),
        })),
      setOriginalImages: (images) => {
        readingImagesStore.setItem("images", images);
        set(() => ({
          originalImages: images,
          updatedAt: Date.now(),
        }));
      },
      addOriginalImage: (image) =>
        set((state) => {
          const newImages = [...state.originalImages, image];
          readingImagesStore.setItem("images", newImages);
          return {
            originalImages: newImages,
            updatedAt: Date.now(),
          };
        }),
      removeOriginalImage: (index) =>
        set((state) => {
          const newImages = state.originalImages.filter((_, i) => i !== index);
          readingImagesStore.setItem("images", newImages);
          return {
            originalImages: newImages,
            updatedAt: Date.now(),
          };
        }),
      setExtractedText: (text) =>
        set(() => ({
          extractedText: text,
          id: get().id || nanoid(),
          createdAt: get().createdAt || Date.now(),
          updatedAt: Date.now(),
        })),
      setSummary: (summary) =>
        set(() => ({
          summary,
          updatedAt: Date.now(),
        })),
      setAdaptedText: (text) =>
        set(() => ({
          adaptedText: text,
          updatedAt: Date.now(),
        })),
      setSimplifiedText: (text) =>
        set(() => ({
          simplifiedText: text,
          updatedAt: Date.now(),
        })),
      addHighlightedWord: (word) =>
        set((state) => {
          const normalizedWord = word.toLowerCase().trim();
          if (state.highlightedWords.includes(normalizedWord)) {
            return state;
          }
          const newState = {
            highlightedWords: [...state.highlightedWords, normalizedWord],
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          return newState;
        }),
      removeHighlightedWord: (word) =>
        set((state) => {
          const newState = {
            highlightedWords: state.highlightedWords.filter(
              (w) => w !== word.toLowerCase().trim()
            ),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          return newState;
        }),
      setHighlightedWords: (words) =>
        set(() => ({
          highlightedWords: words.map((w) => w.toLowerCase().trim()),
          updatedAt: Date.now(),
        })),
      setSentenceAnalysis: (sentence, analysis) =>
        set((state) => {
          const key = sentence.trim().toLowerCase();
          const newState = {
            analyzedSentences: {
              ...state.analyzedSentences,
              [key]: {
                sentence: sentence.trim(),
                analysis,
                createdAt: Date.now(),
              },
            },
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          return newState;
        }),
      removeSentenceAnalysis: (sentence) =>
        set((state) => {
          const key = sentence.trim().toLowerCase();
          const { [key]: _, ...remaining } = state.analyzedSentences;
          const newState = {
            analyzedSentences: remaining,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          return newState;
        }),
      getSentenceAnalysis: (sentence) => {
        const key = sentence.trim().toLowerCase();
        return get().analyzedSentences[key] || null;
      },
      setMindMap: (mermaidCode) =>
        set(() => ({
          mindMap: mermaidCode,
          updatedAt: Date.now(),
        })),
      setReadingTest: (questions) =>
        set(() => ({
          readingTest: questions,
          testCompleted: false,
          testScore: 0,
          testEarnedPoints: 0,
          testTotalPoints: questions.reduce((sum, q) => sum + q.points, 0),
          updatedAt: Date.now(),
        })),
      setUserAnswer: (questionId, answer) =>
        set((state) => ({
          readingTest: state.readingTest.map((q) =>
            q.id === questionId ? { ...q, userAnswer: answer } : q
          ),
          updatedAt: Date.now(),
        })),
      setQuestionEarnedPoints: (questionId, points) =>
        set((state) => ({
          readingTest: state.readingTest.map((q) =>
            q.id === questionId ? { ...q, earnedPoints: points } : q
          ),
          updatedAt: Date.now(),
        })),
      setGlossary: (entries) =>
        set(() => ({
          glossary: entries,
          updatedAt: Date.now(),
        })),
      setGlossaryRating: (word, rating) =>
        set((state) => ({
          glossaryRatings: { ...state.glossaryRatings, [word]: rating },
          updatedAt: Date.now(),
        })),
      setTestScore: (score) =>
        set(() => ({
          testScore: score,
        })),
      setTestCompleted: (completed) =>
        set(() => ({
          testCompleted: completed,
        })),
      setTestPoints: (earned, total) =>
        set(() => ({
          testEarnedPoints: earned,
          testTotalPoints: total,
        })),
      setTestShowChinese: (show) =>
        set(() => ({
          testShowChinese: show,
        })),
      setTestMode: (mode) =>
        set(() => ({
          testMode: mode,
        })),
      setVocabularyQuizScore: (score) =>
        set(() => ({
          vocabularyQuizScore: score,
          updatedAt: Date.now(),
        })),
      setSpellingGameBestScore: (score) =>
        set((state) => ({
          spellingGameBestScore: Math.max(state.spellingGameBestScore, score),
          updatedAt: Date.now(),
        })),
      setStatus: (status) =>
        set(() => ({
          status,
          error: status === "error" ? get().error : null,
        })),
      setError: (error) =>
        set(() => ({
          error,
          status: error ? "error" : get().status,
        })),
      reset: () => {
        readingImagesStore.removeItem("images");
        set(() => ({
          ...defaultValues,
        }));
      },
      backup: () => {
        return {
          ...pick(get(), Object.keys(defaultValues) as (keyof ReadingStore)[]),
        } as ReadingStore;
      },
      restore: (session) =>
        set(() => ({
          ...defaultValues,
          ...session,
        })),
    }),
    {
      name: "reading",
      version: 4,
      partialize: (state) => {
        const keysToPersist = (Object.keys(defaultValues) as (keyof ReadingStore)[]).filter(
          (key) => key !== "originalImages"
        );
        return pick(state, keysToPersist) as ReadingStore & ReadingActions;
      },
      onRehydrateStorage: () => async (state) => {
        if (!state) return;
        try {
          const images = await readingImagesStore.getItem<string[]>("images");
          if (images && Array.isArray(images)) {
            state.originalImages = images;
          }
        } catch (error) {
          console.error("Failed to rehydrate images from IndexedDB:", error);
        }
      },
    }
  )
);
