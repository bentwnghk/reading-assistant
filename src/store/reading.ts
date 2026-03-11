import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";
import { pick } from "radash";
import { nanoid } from "nanoid";

let _isStreaming = false;
export function setStreamingFlag(value: boolean) {
  _isStreaming = value;
}
export function isStreamingActive() {
  return _isStreaming;
}

let currentUserId: string | null = null;
export function setUserId(id: string | null) {
  currentUserId = id;
}

let syncToHistoryFn: ((store: ReadingStore) => void) | null = null;

export function setHistorySyncFn(fn: (store: ReadingStore) => void) {
  syncToHistoryFn = fn;
}

function syncToHistoryIfNeeded(state: ReadingStore) {
  if (syncToHistoryFn && state.id && state.extractedText) {
    const dataKeys = Object.keys(defaultValues) as (keyof ReadingStore)[];
    const dataOnly = pick(state, dataKeys);
    syncToHistoryFn(dataOnly);
  }
}

async function syncToAPI(sessionId: string, data: Partial<ReadingStore>) {
  if (!currentUserId || !sessionId) return;
  
  try {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      console.error("Failed to sync to API:", await response.text());
    }
  } catch (error) {
    console.error("Failed to sync to API:", error);
  }
}

async function createSessionInAPI(sessionData: ReadingStore) {
  if (!currentUserId) return;
  
  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionData),
    });
    
    if (!response.ok) {
      console.error("Failed to create session in API:", await response.text());
    }
  } catch (error) {
    console.error("Failed to create session in API:", error);
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
  chatHistory: ChatMessage[];
  status: ReadingStatus;
  error: string | null;
  originalDifficulty: TextDifficultyResult | null;
  adaptedDifficulty: TextDifficultyResult | null;
  simplifiedDifficulty: TextDifficultyResult | null;
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
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  setStatus: (status: ReadingStatus) => void;
  setError: (error: string | null) => void;
  setStreaming: (value: boolean) => void;
  setOriginalDifficulty: (result: TextDifficultyResult | null) => void;
  setAdaptedDifficulty: (result: TextDifficultyResult | null) => void;
  setSimplifiedDifficulty: (result: TextDifficultyResult | null) => void;
  clearDifficultyAnalysis: () => void;
  reset: () => void;
  backup: () => ReadingStore;
  restore: (session: ReadingStore) => Promise<void>;
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
  chatHistory: [],
  status: "idle",
  error: null,
  originalDifficulty: null,
  adaptedDifficulty: null,
  simplifiedDifficulty: null,
  createdAt: 0,
  updatedAt: 1,
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
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setStudentAge: (age) =>
        set(() => ({
          studentAge: Math.max(8, Math.min(18, age)),
          updatedAt: Date.now(),
        })),
      setOriginalImages: (images) => {
        const sessionId = useReadingStore.getState().id;
        const newState = {
          originalImages: images,
          updatedAt: Date.now(),
        };
        syncToHistoryIfNeeded({ ...useReadingStore.getState(), ...newState });
        if (currentUserId && sessionId) {
          syncToAPI(sessionId, { originalImages: images });
        }
        set(() => newState);
      },
      addOriginalImage: (image) =>
        set((state) => {
          const newImages = [...state.originalImages, image];
          const newState = {
            originalImages: newImages,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, { originalImages: newImages });
          }
          return newState;
        }),
      removeOriginalImage: (index) =>
        set((state) => {
          const newImages = state.originalImages.filter((_, i) => i !== index);
          const newState = {
            originalImages: newImages,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, { originalImages: newImages });
          }
          return newState;
        }),
      setExtractedText: (text) =>
        set((state) => {
          const isNewSession = !state.id;
          const newId = state.id || nanoid();
          const newState = {
            extractedText: text,
            id: newId,
            createdAt: state.createdAt || Date.now(),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId) {
            if (isNewSession) {
              createSessionInAPI({ ...state, ...newState });
            } else {
              syncToAPI(state.id, { extractedText: text });
            }
          }
          return newState;
        }),
      setSummary: (summary) =>
        set((state) => {
          const newState = {
            summary,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setAdaptedText: (text) =>
        set((state) => {
          const newState = {
            adaptedText: text,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setSimplifiedText: (text) =>
        set((state) => {
          const newState = {
            simplifiedText: text,
            updatedAt: Date.now(),
          };
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
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
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
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
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setHighlightedWords: (words) =>
        set((state) => {
          const newState = {
            highlightedWords: words.map((w) => w.toLowerCase().trim()),
            updatedAt: Date.now(),
          };
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
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
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
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
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      getSentenceAnalysis: (sentence) => {
        const key = sentence.trim().toLowerCase();
        return get().analyzedSentences[key] || null;
      },
      setMindMap: (mermaidCode) =>
        set((state) => {
          const newState = {
            mindMap: mermaidCode,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setReadingTest: (questions) =>
        set((state) => {
          const newState = {
            readingTest: questions,
            testCompleted: false,
            testScore: 0,
            testEarnedPoints: 0,
            testTotalPoints: questions.reduce((sum, q) => sum + q.points, 0),
            updatedAt: Date.now(),
          };
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setUserAnswer: (questionId, answer) =>
        set((state) => {
          const newState = {
            readingTest: state.readingTest.map((q) =>
            q.id === questionId ? { ...q, userAnswer: answer } : q
          ),
            updatedAt: Date.now(),
          };
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setQuestionEarnedPoints: (questionId, points) =>
        set((state) => {
          const newState = {
            readingTest: state.readingTest.map((q) =>
              q.id === questionId ? { ...q, earnedPoints: points } : q
            ),
            updatedAt: Date.now(),
          };
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGlossary: (entries) =>
        set((state) => {
          const newState = {
            glossary: entries,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGlossaryRating: (word, rating) =>
        set((state) => {
          const newState = {
            glossaryRatings: { ...state.glossaryRatings, [word]: rating },
            updatedAt: Date.now(),
          };
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setTestScore: (score) =>
        set(() => ({
          testScore: score,
        })),
      setTestCompleted: (completed) =>
        set((state) => {
          const newState = {
            testCompleted: completed,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
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
        set((state) => {
          const newState = {
            vocabularyQuizScore: score,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setSpellingGameBestScore: (score) =>
        set((state) => {
          const newState = {
            spellingGameBestScore: Math.max(state.spellingGameBestScore, score),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      addChatMessage: (message) =>
        set((state) => ({
          chatHistory: [...state.chatHistory, message],
          updatedAt: Date.now(),
        })),
      clearChatHistory: () =>
        set(() => ({
          chatHistory: [],
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
      setStreaming: (value) => {
        setStreamingFlag(value);
      },
      setOriginalDifficulty: (result) =>
        set((state) => {
          const newState = {
            originalDifficulty: result,
            updatedAt: Date.now(),
          };
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setAdaptedDifficulty: (result) =>
        set((state) => {
          const newState = {
            adaptedDifficulty: result,
            updatedAt: Date.now(),
          };
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setSimplifiedDifficulty: (result) =>
        set((state) => {
          const newState = {
            simplifiedDifficulty: result,
            updatedAt: Date.now(),
          };
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      clearDifficultyAnalysis: () =>
        set((state) => {
          const newState = {
            originalDifficulty: null,
            adaptedDifficulty: null,
            simplifiedDifficulty: null,
            updatedAt: Date.now(),
          };
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      reset: () => {
        set(() => ({
          ...defaultValues,
        }));
      },
      backup: () => {
        const state = get();
        return {
          ...pick(state, Object.keys(defaultValues) as (keyof ReadingStore)[]),
        } as ReadingStore;
      },
      restore: async (session) => {
        set(() => ({
          ...defaultValues,
          ...session,
        }));
      },
    }),
    {
      name: "reading",
      version: 6,
      storage: {
        getItem: (name) => {
          const value = localStorage.getItem(name);
          return value ? (JSON.parse(value) as StorageValue<ReadingStore & ReadingActions>) : null;
        },
        setItem: (name, value) => {
          if (_isStreaming) return;
          if (currentUserId) return; // Don't persist to localStorage for authenticated users
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => {
        if (currentUserId) {
          return {} as ReadingStore & ReadingActions;
        }
        const keysToPersist = (Object.keys(defaultValues) as (keyof ReadingStore)[]).filter(
          (key) => key !== "originalImages"
        );
        return pick(state, keysToPersist) as ReadingStore & ReadingActions;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.status !== "idle" && state.status !== "error") {
          state.status = "idle";
        }
      },
    }
  )
);
