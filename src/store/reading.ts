import { create } from "zustand";
import { persist } from "zustand/middleware";
import { pick } from "radash";
import { nanoid } from "nanoid";

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

export interface ReadingStore {
  id: string;
  studentAge: number;
  originalImages: string[];
  extractedText: string;
  summary: string;
  adaptedText: string;
  simplifiedText: string;
  highlightedWords: string[];
  mindMap: string;
  readingTest: ReadingTestQuestion[];
  glossary: GlossaryEntry[];
  glossaryRatings: Record<string, GlossaryRating>;
  testScore: number;
  testCompleted: boolean;
  status: ReadingStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

interface ReadingActions {
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
  setMindMap: (mermaidCode: string) => void;
  setReadingTest: (questions: ReadingTestQuestion[]) => void;
  setUserAnswer: (questionId: string, answer: string) => void;
  setGlossary: (entries: GlossaryEntry[]) => void;
  setGlossaryRating: (word: string, rating: GlossaryRating) => void;
  setTestScore: (score: number) => void;
  setTestCompleted: (completed: boolean) => void;
  setStatus: (status: ReadingStatus) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  backup: () => ReadingStore;
  restore: (session: ReadingStore) => void;
}

const defaultValues: ReadingStore = {
  id: "",
  studentAge: 13,
  originalImages: [],
  extractedText: "",
  summary: "",
  adaptedText: "",
  simplifiedText: "",
  highlightedWords: [],
  mindMap: "",
  readingTest: [],
  glossary: [],
  glossaryRatings: {},
  testScore: 0,
  testCompleted: false,
  status: "idle",
  error: null,
  createdAt: 0,
  updatedAt: 0,
};

export const useReadingStore = create(
  persist<ReadingStore & ReadingActions>(
    (set, get) => ({
      ...defaultValues,
      setStudentAge: (age) =>
        set(() => ({
          studentAge: Math.max(8, Math.min(18, age)),
          updatedAt: Date.now(),
        })),
      setOriginalImages: (images) =>
        set(() => ({
          originalImages: images,
          updatedAt: Date.now(),
        })),
      addOriginalImage: (image) =>
        set((state) => ({
          originalImages: [...state.originalImages, image],
          updatedAt: Date.now(),
        })),
      removeOriginalImage: (index) =>
        set((state) => ({
          originalImages: state.originalImages.filter((_, i) => i !== index),
          updatedAt: Date.now(),
        })),
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
          return {
            highlightedWords: [...state.highlightedWords, normalizedWord],
            updatedAt: Date.now(),
          };
        }),
      removeHighlightedWord: (word) =>
        set((state) => ({
          highlightedWords: state.highlightedWords.filter(
            (w) => w !== word.toLowerCase().trim()
          ),
          updatedAt: Date.now(),
        })),
      setHighlightedWords: (words) =>
        set(() => ({
          highlightedWords: words.map((w) => w.toLowerCase().trim()),
          updatedAt: Date.now(),
        })),
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
          updatedAt: Date.now(),
        })),
      setUserAnswer: (questionId, answer) =>
        set((state) => ({
          readingTest: state.readingTest.map((q) =>
            q.id === questionId ? { ...q, userAnswer: answer } : q
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
      reset: () =>
        set(() => ({
          ...defaultValues,
        })),
      backup: () => {
        return {
          ...pick(get(), Object.keys(defaultValues) as (keyof ReadingStore)[]),
        } as ReadingStore;
      },
      restore: (session) =>
        set(() => ({
          ...session,
        })),
    }),
    {
      name: "reading",
      partialize: (state) => {
        const persisted = { ...state };
        delete (persisted as Record<string, unknown>).originalImages;
        return persisted as ReadingStore & ReadingActions;
      },
    }
  )
);
