import { create } from "zustand";
import { persist, createJSONStorage, StorageValue } from "zustand/middleware";
import { pick } from "radash";
import { nanoid } from "nanoid";

let _isStreaming = false;
export function setStreamingFlag(value: boolean) {
  _isStreaming = value;
}
export function isStreamingActive() {
  return _isStreaming;
}

let userId: string | null = null
export function setUserId(id: string | null) {
  userId = id;
}

let syncToHistoryFn: ((store: ReadingStore) => ReadingActions) => void) | null = null;
  const sessionId = useReadingStore.getState().id;
  if (sessionId && userId) {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sessionData, id }),
      });
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

let _isStreaming = false
export function setStreamingFlag(value: boolean) {
  _isStreaming = value
}
export function isStreamingActive() {
  return _isStreaming
}

let userId: string | null = null
export function setUserId(id: string | null) {
  userId = id
}

let syncToHistoryFn: ((store: ReadingStore) & ReadingActions) => void) | null = null
    const sessionId = useReadingStore.getState().id
    if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sessionData, id }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  private async syncToDatabase(sessionData: Partial<ReadingStore>) {
    const sessionId = useReadingStore.getState().id
    if (!sessionId || !userId) return

    const dataKeys = Object.keys(defaultValues) as (keyof ReadingStore)[]
    const dataOnly = pick(sessionData, dataKeys)
    syncToHistoryFn(dataOnly)
  }
  }

  const setOriginalImages: (images: images) => {
    if (userId) {
      await updateReadingSession(userId, sessionId, { originalImages: images })
    }
  }

  const setStreaming = (value) => setStreamingFlag(value)
  }

  const addOriginalImage: (image: string) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId) return
    }
    
    const newImages = [...state.originalImages, image]
    if (userId) {
      await updateReadingSession(userId, sessionId, { originalImages: newImages })
    }
    set(() => ({
      originalImages: newImages,
      updatedAt: Date.now(),
    }))
  }

  const removeOriginalImage: (index: number) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId) return
    }
    
    const newImages = state.originalImages.filter((_, i) => i !== index)
    if (userId) {
      await updateReadingSession(userId, sessionId, { originalImages: newImages })
    }
    set(() => ({
      originalImages: newImages,
      updatedAt: Date.now(),
    }))
  }

  const setExtractedText: (text: string) => {
    if (userId) {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const setSummary: (summary: string) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const setAdaptedText: (text: string) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adaptedText: text }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const setSimplifiedText: (text: string) => {
    set(() => ({
      simplifiedText: text,
      updatedAt: Date.now(),
    }))
  }

  const addHighlightedWord: (word: string) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ highlightedWords: [...state.highlightedWords, normalizedWord] }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const removeHighlightedWord: (word: string) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ highlightedWords: state.highlightedWords.filter((w) => w !== word.toLowerCase().trim()) }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const setHighlightedWords: (words) string) => {
    set(() => ({
      highlightedWords: words.map((w) => w.toLowerCase().trim()),
      updatedAt: Date.now(),
    }))
  }

  const setSentenceAnalysis: (sentence: string, analysis: string) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence, sentence, analysis }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const removeSentenceAnalysis: (sentence: string) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const getSentenceAnalysis: (sentence: string) => {
    const key = sentence.trim().toLowerCase()
    return get().analyzedSentences[key] || null
  }

  const setMindMap: (mermaidCode: string) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mindMap: mermaidCode }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const setReadingTest: (questions: ReadingTestQuestion[]) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingTest: questions }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const setUserAnswer: (questionId: string, answer: string) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingTest: state.readingTest.map((q) =>
            q.id === questionId ? { ...q, userAnswer: answer } : q
          }),
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const setQuestionEarnedPoints: (questionId: string, points: number) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingTest: state.readingTest.map((q) =>
            q.id === questionId ? { ...q, earnedPoints: points } : q
          }),
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const setGlossary: (entries: GlossaryEntry[]) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ glossary: entries }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync session to API:", error)
        throw error
      }
    } finally {
  }

  const setGlossaryRating: (word: string, rating: GlossaryRating) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ glossaryRatings: { ...state.glossaryRatings, [word]: rating } }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync glossary rating to API:", error)
        throw error
      }
    } finally {
  }

  const setTestScore: (score: number) => {
    set(() => ({ testScore: score }))
  }

  const setTestCompleted: (completed: boolean) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCompleted: completed }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync test completed to API:", error)
        throw error
      }
    } finally {
  }

  const setTestPoints: (earned: number, total: number) => {
    set(() => ({
      testEarnedPoints: earned,
      testTotalPoints: total,
    }))
  }

  const setTestShowChinese: (show: boolean) => {
    set(() => ({ testShowChinese: show }))
  }

  const setTestMode: (mode: ReadingTestMode) => {
    set(() => ({ testMode: mode }))
  }

  const setVocabularyQuizScore: (score: number) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vocabularyQuizScore: score }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync vocabulary quiz score to API:", error)
        throw error
      }
    } finally {
  }

  const setSpellingGameBestScore: (score: number) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spellingGameBestScore: score }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync spelling game best score to API:", error)
        throw error
      }
    } finally {
  }

  const addChatMessage: (message: ChatMessage) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatHistory: [...state.chatHistory, message] }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync chat message to API:", error)
        throw error
      }
    } finally {
  }

  const clearChatHistory: () => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatHistory: [] }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to clear chat history in API:", error)
        throw error
      }
    } finally {
  }

  const setStatus: (status: ReadingStatus) => {
    set(() => ({
      status,
      error: status === "error" ? get().error : null,
    }))
  }

  const setError: (error: string | null) => {
    set(() => ({
      error,
      status: error ? "error" : get().status,
    }))
  }

  const setStreaming: (value: boolean) => setStreamingFlag(value)
  }

  const setOriginalDifficulty: (result: TextDifficultyResult | null) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalDifficulty: result }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync original difficulty to API:", error)
        throw error
      }
    } finally {
  }

  const setAdaptedDifficulty: (result: TextDifficultyResult | null) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adaptedDifficulty: result }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync adapted difficulty in API:", error)
        throw error
      }
    } finally {
  }

  const setSimplifiedDifficulty: (result: TextDifficultyResult | null) => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simplifiedDifficulty: result }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to sync simplified difficulty in API:", error)
        throw error
      }
    } finally {
  }

  const clearDifficultyAnalysis: () => {
    if (userId) {
      const sessionId = useReadingStore.getState().id
      if (!sessionId || !userId) return

    try {
      const response = await fetch("/api/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalDifficulty: null,
          adaptedDifficulty: null,
          simplifiedDifficulty: null,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        useReadingStore.getState().restore(data)
      } else {
        console.error("Failed to clear difficulty analysis in API:", error)
        throw error
      }
    } finally {
  }

  const reset: () => {
    set(() => ({
      ...defaultValues,
    }))
  }

  const backup: () => {
    const state = get()
    const sessionId = state.id
    if (sessionId && state.originalImages.length > 0) {
      saveImagesToIndexedDB(sessionId, state.originalImages)
    }
    return {
      ...pick(state, Object.keys(defaultValues) as (keyof ReadingStore)[]),
    } as ReadingStore
 }

  const restore: async (session: ReadingStore) => {
    const sessionId = session.id
    let images = session.originalImages
    if (sessionId) {
      try {
        const storedImages = await loadImagesFromIndexedDB(sessionId)
        if (storedImages.length > 0) {
          images = storedImages
        }
      } catch (error) {
        console.error("Failed to load images from IndexedDB:", error)
      }
    }
    set(() => ({
      ...defaultValues,
      ...session,
      originalImages: images,
    }))
  },
  }),
  {
      name: "reading",
      version: 6,
      storage: {
        getItem: (name) => {
          const value = localStorage.getItem(name)
          return value ? (JSON.parse(value) as StorageValue<ReadingStore & ReadingActions>) : null
        },
        setItem: (name, value) => {
          if (_isStreaming) return
          if (userId) {
            return
          }
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => {
        const keysToPersist = (Object.keys(defaultValues) as (keyof ReadingStore)[]).filter(
          (key) => key !== "originalImages"
        )
        return pick(state, keysToPersist) as ReadingStore & ReadingActions
      },
      onRehydrateStorage: () => async (state) => {
        if (!state) return
        if (state.status !== "idle" && state.status !== "error") {
          state.status = "idle"
        }
      },
    }
  )
)


// Module-level flag that gates localStorage writes during active streaming.
// Using a plain variable (not Zustand state) avoids triggering re-renders and,
// crucially, avoids re-entering the persist middleware while it is already
// deciding whether to write. Set to true before a stream loop starts and back
// to false when the loop ends so that only the final complete value is flushed
// to localStorage — preventing the iOS Safari crash caused by hundreds of rapid
// synchronous localStorage.setItem calls during token streaming.
let _isStreaming = false;
export function setStreamingFlag(value: boolean) {
  _isStreaming = value;
}
export function isStreamingActive() {
  return _isStreaming;
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

export async function saveImagesToIndexedDB(sessionId: string, images: string[]) {
  if (sessionId) {
    await readingImagesStore.setItem(`images_${sessionId}`, images);
  }
}

export async function loadImagesFromIndexedDB(sessionId: string): Promise<string[]> {
  if (!sessionId) return [];
  const images = await readingImagesStore.getItem<string[]>(`images_${sessionId}`);
  return images && Array.isArray(images) ? images : [];
}

export async function removeImagesFromIndexedDB(sessionId: string) {
  if (sessionId) {
    await readingImagesStore.removeItem(`images_${sessionId}`);
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
        const sessionId = useReadingStore.getState().id;
        if (sessionId) {
          saveImagesToIndexedDB(sessionId, images);
        }
        set(() => ({
          originalImages: images,
          updatedAt: Date.now(),
        }));
      },
      addOriginalImage: (image) =>
        set((state) => {
          const newImages = [...state.originalImages, image];
          if (state.id) {
            saveImagesToIndexedDB(state.id, newImages);
          }
          return {
            originalImages: newImages,
            updatedAt: Date.now(),
          };
        }),
      removeOriginalImage: (index) =>
        set((state) => {
          const newImages = state.originalImages.filter((_, i) => i !== index);
          if (state.id) {
            saveImagesToIndexedDB(state.id, newImages);
          }
          return {
            originalImages: newImages,
            updatedAt: Date.now(),
          };
        }),
      setExtractedText: (text) =>
        set((state) => {
          const newId = state.id || nanoid();
          // Do NOT call saveImagesToIndexedDB here — this action is called on
          // every streamed token and would hammer IndexedDB hundreds of times
          // per second, crashing iOS Safari. Images are saved once explicitly
          // by the caller after the stream completes.
          return {
            extractedText: text,
            id: newId,
            createdAt: state.createdAt || Date.now(),
            updatedAt: Date.now(),
          };
        }),
      setSummary: (summary) =>
        set((state) => {
          const newState = {
            summary,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          return newState;
        }),
      setAdaptedText: (text) =>
        set((state) => {
          const newState = {
            adaptedText: text,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          return newState;
        }),
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
        set((state) => {
          const newState = {
            mindMap: mermaidCode,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          return newState;
        }),
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
        set((state) => {
          const newState = {
            glossary: entries,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          return newState;
        }),
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
        set((state) => {
          const newState = {
            testCompleted: completed,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
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
          return newState;
        }),
      setSpellingGameBestScore: (score) =>
        set((state) => {
          const newState = {
            spellingGameBestScore: Math.max(state.spellingGameBestScore, score),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
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
        set(() => ({
          originalDifficulty: result,
          updatedAt: Date.now(),
        })),
      setAdaptedDifficulty: (result) =>
        set(() => ({
          adaptedDifficulty: result,
          updatedAt: Date.now(),
        })),
      setSimplifiedDifficulty: (result) =>
        set(() => ({
          simplifiedDifficulty: result,
          updatedAt: Date.now(),
        })),
      clearDifficultyAnalysis: () =>
        set(() => ({
          originalDifficulty: null,
          adaptedDifficulty: null,
          simplifiedDifficulty: null,
          updatedAt: Date.now(),
        })),
      reset: () => {
        const sessionId = useReadingStore.getState().id;
        if (sessionId) {
          removeImagesFromIndexedDB(sessionId);
        }
        set(() => ({
          ...defaultValues,
        }));
      },
      backup: () => {
        const state = get();
        const sessionId = state.id;
        if (sessionId && state.originalImages.length > 0) {
          saveImagesToIndexedDB(sessionId, state.originalImages);
        }
        return {
          ...pick(state, Object.keys(defaultValues) as (keyof ReadingStore)[]),
        } as ReadingStore;
      },
      restore: async (session) => {
        const sessionId = session.id;
        let images = session.originalImages;
        if (sessionId) {
          const storedImages = await loadImagesFromIndexedDB(sessionId);
          if (storedImages.length > 0) {
            images = storedImages;
          }
        }
        set(() => ({
          ...defaultValues,
          ...session,
          originalImages: images,
        }));
      },
    }),
    {
      name: "reading",
      version: 5,
      // Intercept storage writes so that rapid per-token calls during streaming
      // do NOT hit localStorage. iOS Safari crashes / reloads the page when
      // localStorage.setItem is hammered hundreds of times per second from
      // inside the streamText token loop. We suppress all writes while
      // _isStreaming is true; the final write after the loop completes will
      // flush the full, complete text in one shot.
      storage: {
        getItem: (name) => {
          const value = localStorage.getItem(name);
          return value ? (JSON.parse(value) as StorageValue<ReadingStore & ReadingActions>) : null;
        },
        setItem: (name, value) => {
          if (_isStreaming) return; // skip all writes during active token stream
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => {
        const keysToPersist = (Object.keys(defaultValues) as (keyof ReadingStore)[]).filter(
          (key) => key !== "originalImages"
        );
        return pick(state, keysToPersist) as ReadingStore & ReadingActions;
      },
      onRehydrateStorage: () => async (state) => {
        if (!state) return;
        // Reset any in-progress status that was interrupted (e.g. iOS PWA page refresh
        // during streaming). Without this, the store rehydrates with status="extracting"
        // but no operation is actually running, leaving the UI stuck.
        if (state.status !== "idle" && state.status !== "error") {
          state.status = "idle";
        }
        if (!state.id) return;
        try {
          const images = await loadImagesFromIndexedDB(state.id);
          if (images.length > 0) {
            state.originalImages = images;
          }
        } catch (error) {
          console.error("Failed to rehydrate images from IndexedDB:", error);
        }
      },
    }
  )
);
