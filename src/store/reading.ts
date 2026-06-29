import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";
import { pick } from "radash";
import { nanoid } from "nanoid";
import { markLastOpenedSession } from "@/store/setting";

let _isStreaming = false;
export function setStreamingFlag(value: boolean) {
  _isStreaming = value;
}
export function isStreamingActive() {
  return _isStreaming;
}

let _restoreComplete = false;
export function setRestoreComplete(value: boolean) {
  _restoreComplete = value;
}
export function isRestoreComplete() {
  return _restoreComplete;
}

let _welcomeDialogChecked = false;
export function setWelcomeDialogChecked(value: boolean) {
  _welcomeDialogChecked = value;
}
export function isWelcomeDialogChecked() {
  return _welcomeDialogChecked;
}

let currentUserId: string | null = null;
export function setUserId(id: string | null) {
  currentUserId = id;
}

const sessionCreatedInApi: Set<string> = new Set();
export function markSessionCreated(sessionId: string) {
  sessionCreatedInApi.add(sessionId);
}
export function isSessionCreatedInApi(sessionId: string) {
  return sessionCreatedInApi.has(sessionId);
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
  if (!isSessionCreatedInApi(sessionId)) return;
  
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
    } else {
      markSessionCreated(sessionData.id);
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
  | "visualization"
  | "testing"
  | "glossary"
  | "grammar"
  | "error";

type ReadingTestMode = "all-at-once" | "question-by-question";
type TextSource = "upload" | "repository" | "shared" | "assignment";

export interface ReadingStore {
  id: string;
  docTitle: string;
  studentAge: number;
  source: TextSource;
  originalImages: string[];
  extractedText: string;
  summary: string;
  adaptedText: string;
  simplifiedText: string;
  highlightedWords: string[];
  analyzedSentences: Record<string, SentenceAnalysis>;
  mindMap: string;
  visualizationImage: string;
  visualizationGeneratedAt: number;
  readingTest: ReadingTestQuestion[];
  glossary: GlossaryEntry[];
  glossaryRatings: Record<string, GlossaryRating>;
  grammarTopics: GrammarTopic[];
  grammarQuiz: GrammarQuizQuestion[];
  grammarQuizScore: number;
  grammarQuizCompleted: boolean;
  grammarQuizzesCompleted: number;
  grammarQuizEarnedPoints: number;
  grammarQuizTotalPoints: number;
  grammarGeneratedAt: number;
  grammarQuizCompletedAt: number;
  grammarHighlightEnabled: boolean;
  grammarHighlightTopicId: string | null;
  grammarQuizMode: ReadingTestMode;
  // Grammar Games — scores & per-game accuracy
  grammarScrambleHighScore: number;
  grammarWorkshopHighScore: number;
  grammarSurgeryHighScore: number;
  grammarRouletteHighScore: number;
  grammarDuelHighScore: number;
  grammarScrambleAccuracy: number;
  grammarWorkshopAccuracy: number;
  grammarSurgeryAccuracy: number;
  grammarRouletteAccuracy: number;
  grammarDuelAccuracy: number;
  grammarScrambleCompleted: number;
  grammarWorkshopCompleted: number;
  grammarSurgeryCompleted: number;
  grammarRouletteCompleted: number;
  grammarDuelCompleted: number;
  grammarGameAccuracy: number;
  grammarGamesCompleted: number;
  grammarGameCompletedAt: number;
  // Grammar Games — cached AI content
  grammarErrorChallenges: ErrorSurgeryChallenge[];
  grammarScrambleChallenges: GrammarScrambleChallenge[];
  grammarWorkshopChallenges: GrammarWorkshopChallenge[];
  grammarGameQuestions: GrammarGameQuestion[];
  testScore: number;
  testCompleted: boolean;
  testEarnedPoints: number;
  testTotalPoints: number;
  testShowChinese: boolean;
  testMode: ReadingTestMode;
  testsCompleted: number;
  vocabularyQuizScore: number;
  vocabQuizzesCompleted: number;
  spellingGameBestScore: number;
  spellingGameAccuracy: number;
  spellingGamesCompleted: number;
  flashcardReviewDates: number[];
  summaryGeneratedAt: number;
  mindMapGeneratedAt: number;
  adaptedTextGeneratedAt: number;
  simplifiedTextGeneratedAt: number;
  glossaryGeneratedAt: number;
  spellingGameCompletedAt: number;
  vocabQuizCompletedAt: number;
  readingTestCompletedAt: number;
  chatHistory: ChatMessage[];
  status: ReadingStatus;
  error: string | null;
  originalDifficulty: TextDifficultyResult | null;
  adaptedDifficulty: TextDifficultyResult | null;
  simplifiedDifficulty: TextDifficultyResult | null;
  includeGlossary: boolean;
  includeSentenceAnalysis: boolean;
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
  setVisualizationImage: (imageDataUrl: string) => void;
  setReadingTest: (questions: ReadingTestQuestion[]) => void;
  setUserAnswer: (questionId: string, answer: string) => void;
  setQuestionEarnedPoints: (questionId: string, points: number) => void;
  setGlossary: (entries: GlossaryEntry[]) => void;
  setGlossaryRating: (word: string, rating: GlossaryRating) => void;
  setGrammarTopics: (topics: GrammarTopic[]) => void;
  setGrammarQuiz: (questions: GrammarQuizQuestion[]) => void;
  setGrammarQuizAnswer: (questionId: string, answer: string) => void;
  setGrammarQuizQuestionPoints: (questionId: string, points: number) => void;
  setGrammarQuizScore: (score: number) => void;
  setGrammarQuizCompleted: (completed: boolean) => void;
  setGrammarQuizPoints: (earned: number, total: number) => void;
  setGrammarHighlightEnabled: (enabled: boolean) => void;
  setGrammarHighlightTopicId: (topicId: string | null) => void;
  setGrammarQuizMode: (mode: ReadingTestMode) => void;
  // Grammar Games
  setGrammarScrambleHighScore: (score: number, accuracy: number) => void;
  setGrammarWorkshopHighScore: (score: number, accuracy: number) => void;
  setGrammarSurgeryHighScore: (score: number, accuracy: number) => void;
  setGrammarRouletteHighScore: (score: number, accuracy: number) => void;
  setGrammarDuelHighScore: (score: number, accuracy: number) => void;
  setGrammarGameAccuracy: (accuracy: number) => void;
  // Grammar Games setters — cached AI content
  setGrammarErrorChallenges: (challenges: ErrorSurgeryChallenge[]) => void;
  setGrammarScrambleChallenges: (challenges: GrammarScrambleChallenge[]) => void;
  setGrammarWorkshopChallenges: (challenges: GrammarWorkshopChallenge[]) => void;
  setGrammarGameQuestions: (questions: GrammarGameQuestion[]) => void;
  setTestScore: (score: number) => void;
  setTestCompleted: (completed: boolean) => void;
  setTestPoints: (earned: number, total: number) => void;
  setTestShowChinese: (show: boolean) => void;
  setTestMode: (mode: ReadingTestMode) => void;
  setVocabularyQuizScore: (score: number) => void;
  setSpellingGameBestScore: (score: number, accuracy: number) => void;
  incrementFlashcardReviewCount: () => void; // appends Date.now() to flashcardReviewDates
  addChatMessage: (message: ChatMessage) => void;
  removeChatMessage: (id: string) => void;
  clearChatHistory: () => void;
  setStatus: (status: ReadingStatus) => void;
  setError: (error: string | null) => void;
  setStreaming: (value: boolean) => void;
  setOriginalDifficulty: (result: TextDifficultyResult | null) => void;
  setAdaptedDifficulty: (result: TextDifficultyResult | null) => void;
  setSimplifiedDifficulty: (result: TextDifficultyResult | null) => void;
  clearDifficultyAnalysis: () => void;
  setIncludeGlossary: (include: boolean) => void;
  setIncludeSentenceAnalysis: (include: boolean) => void;
  clearDerivedData: () => void;
  loadFromRepository: (text: RepositoryText) => void;
  setSource: (source: TextSource) => void;
  reset: () => void;
  backup: () => ReadingStore;
  restore: (session: ReadingStore) => Promise<void>;
}

const defaultValues: ReadingStore = {
  id: "",
  docTitle: "",
  studentAge: 13,
  source: "upload" as TextSource,
  originalImages: [],
  extractedText: "",
  summary: "",
  adaptedText: "",
  simplifiedText: "",
  highlightedWords: [],
  analyzedSentences: {},
  mindMap: "",
  visualizationImage: "",
  visualizationGeneratedAt: 0,
  readingTest: [],
  glossary: [],
  glossaryRatings: {},
  grammarTopics: [],
  grammarQuiz: [],
  grammarQuizScore: 0,
  grammarQuizCompleted: false,
  grammarQuizzesCompleted: 0,
  grammarQuizEarnedPoints: 0,
  grammarQuizTotalPoints: 0,
  grammarGeneratedAt: 0,
  grammarQuizCompletedAt: 0,
  grammarHighlightEnabled: false,
  grammarHighlightTopicId: null,
  grammarQuizMode: "all-at-once",
  grammarScrambleHighScore: 0,
  grammarWorkshopHighScore: 0,
  grammarSurgeryHighScore: 0,
  grammarRouletteHighScore: 0,
  grammarDuelHighScore: 0,
  grammarScrambleAccuracy: 0,
  grammarWorkshopAccuracy: 0,
  grammarSurgeryAccuracy: 0,
  grammarRouletteAccuracy: 0,
  grammarDuelAccuracy: 0,
  grammarScrambleCompleted: 0,
  grammarWorkshopCompleted: 0,
  grammarSurgeryCompleted: 0,
  grammarRouletteCompleted: 0,
  grammarDuelCompleted: 0,
  grammarGameAccuracy: 0,
  grammarGamesCompleted: 0,
  grammarGameCompletedAt: 0,
  grammarErrorChallenges: [],
  grammarScrambleChallenges: [],
  grammarWorkshopChallenges: [],
  grammarGameQuestions: [],
  testScore: 0,
  testCompleted: false,
  testEarnedPoints: 0,
  testTotalPoints: 0,
  testShowChinese: false,
  testMode: "all-at-once",
  testsCompleted: 0,
  vocabularyQuizScore: 0,
  vocabQuizzesCompleted: 0,
    spellingGameBestScore: 0,
    spellingGameAccuracy: 0,
    spellingGamesCompleted: 0,
  flashcardReviewDates: [],
  summaryGeneratedAt: 0,
  mindMapGeneratedAt: 0,
  adaptedTextGeneratedAt: 0,
  simplifiedTextGeneratedAt: 0,
  glossaryGeneratedAt: 0,
  spellingGameCompletedAt: 0,
  vocabQuizCompletedAt: 0,
  readingTestCompletedAt: 0,
  chatHistory: [],
  status: "idle",
  error: null,
  originalDifficulty: null,
  adaptedDifficulty: null,
  simplifiedDifficulty: null,
  includeGlossary: true,
  includeSentenceAnalysis: true,
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
        set((state) => {
          const newState = {
            studentAge: Math.max(8, Math.min(18, age)),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
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
            summaryGeneratedAt: Date.now(),
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
            adaptedTextGeneratedAt: Date.now(),
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
            simplifiedTextGeneratedAt: Date.now(),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
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
          syncToHistoryIfNeeded({ ...state, ...newState });
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
            mindMapGeneratedAt: Date.now(),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setVisualizationImage: (imageDataUrl) =>
        set((state) => {
          const newState = {
            visualizationImage: imageDataUrl,
            visualizationGeneratedAt: Date.now(),
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
          syncToHistoryIfNeeded({ ...state, ...newState });
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
          syncToHistoryIfNeeded({ ...state, ...newState });
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
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGlossary: (entries) =>
        set((state) => {
          const newState = {
            glossary: entries,
            glossaryGeneratedAt: Date.now(),
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
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarTopics: (topics) =>
        set((state) => {
          const newState = {
            grammarTopics: topics,
            grammarGeneratedAt: Date.now(),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarQuiz: (questions) =>
        set((state) => {
          const newState = {
            grammarQuiz: questions,
            grammarQuizCompleted: false,
            grammarQuizScore: 0,
            grammarQuizEarnedPoints: 0,
            grammarQuizTotalPoints: questions.reduce((sum, q) => sum + q.points, 0),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarQuizAnswer: (questionId, answer) =>
        set((state) => {
          const newState = {
            grammarQuiz: state.grammarQuiz.map((q) =>
              q.id === questionId ? { ...q, userAnswer: answer } : q
            ),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarQuizQuestionPoints: (questionId, points) =>
        set((state) => {
          const newState = {
            grammarQuiz: state.grammarQuiz.map((q) =>
              q.id === questionId ? { ...q, earnedPoints: points } : q
            ),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarQuizScore: (score) =>
        set((state) => {
          const newState = {
            grammarQuizScore: score,
            grammarQuizzesCompleted: score > 0 ? (state.grammarQuizzesCompleted || 0) + 1 : state.grammarQuizzesCompleted,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarQuizCompleted: (completed) =>
        set((state) => {
          const newState = {
            grammarQuizCompleted: completed,
            ...(completed ? { grammarQuizCompletedAt: Date.now() } : {}),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarQuizPoints: (earned, total) =>
        set((state) => {
          const newState = {
            grammarQuizEarnedPoints: earned,
            grammarQuizTotalPoints: total,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarHighlightEnabled: (enabled) =>
        set((state) => {
          const newState = {
            grammarHighlightEnabled: enabled,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarHighlightTopicId: (topicId) =>
        set((state) => {
          const newState = {
            grammarHighlightTopicId: topicId,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarQuizMode: (mode) =>
        set((state) => {
          const newState = {
            grammarQuizMode: mode,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      // ── Grammar Games setters ──────────────────────────────────────────────
      setGrammarScrambleHighScore: (score, accuracy) =>
        set((state) => {
          const count = state.grammarScrambleCompleted + 1;
          const newState = {
            grammarScrambleHighScore: Math.max(state.grammarScrambleHighScore, score),
            grammarScrambleAccuracy: Math.round(
              (state.grammarScrambleAccuracy * state.grammarScrambleCompleted + accuracy) / count
            ),
            grammarScrambleCompleted: count,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarWorkshopHighScore: (score, accuracy) =>
        set((state) => {
          const count = state.grammarWorkshopCompleted + 1;
          const newState = {
            grammarWorkshopHighScore: Math.max(state.grammarWorkshopHighScore, score),
            grammarWorkshopAccuracy: Math.round(
              (state.grammarWorkshopAccuracy * state.grammarWorkshopCompleted + accuracy) / count
            ),
            grammarWorkshopCompleted: count,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarSurgeryHighScore: (score, accuracy) =>
        set((state) => {
          const count = state.grammarSurgeryCompleted + 1;
          const newState = {
            grammarSurgeryHighScore: Math.max(state.grammarSurgeryHighScore, score),
            grammarSurgeryAccuracy: Math.round(
              (state.grammarSurgeryAccuracy * state.grammarSurgeryCompleted + accuracy) / count
            ),
            grammarSurgeryCompleted: count,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarRouletteHighScore: (score, accuracy) =>
        set((state) => {
          const count = state.grammarRouletteCompleted + 1;
          const newState = {
            grammarRouletteHighScore: Math.max(state.grammarRouletteHighScore, score),
            grammarRouletteAccuracy: Math.round(
              (state.grammarRouletteAccuracy * state.grammarRouletteCompleted + accuracy) / count
            ),
            grammarRouletteCompleted: count,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarDuelHighScore: (score, accuracy) =>
        set((state) => {
          const count = state.grammarDuelCompleted + 1;
          const newState = {
            grammarDuelHighScore: Math.max(state.grammarDuelHighScore, score),
            grammarDuelAccuracy: Math.round(
              (state.grammarDuelAccuracy * state.grammarDuelCompleted + accuracy) / count
            ),
            grammarDuelCompleted: count,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setGrammarGameAccuracy: (accuracy) =>
        set((state) => {
          const count = state.grammarGamesCompleted + 1;
          const newState = {
            grammarGameAccuracy: Math.round(
              (state.grammarGameAccuracy * state.grammarGamesCompleted + accuracy) / count
            ),
            grammarGamesCompleted: count,
            grammarGameCompletedAt: Date.now(),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) syncToAPI(state.id, newState);
          return newState;
        }),
      setGrammarErrorChallenges: (challenges) =>
        set((state) => {
          const newState = { grammarErrorChallenges: challenges, updatedAt: Date.now() };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) syncToAPI(state.id, newState);
          return newState;
        }),
      setGrammarScrambleChallenges: (challenges) =>
        set((state) => {
          const newState = { grammarScrambleChallenges: challenges, updatedAt: Date.now() };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) syncToAPI(state.id, newState);
          return newState;
        }),
      setGrammarWorkshopChallenges: (challenges) =>
        set((state) => {
          const newState = { grammarWorkshopChallenges: challenges, updatedAt: Date.now() };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) syncToAPI(state.id, newState);
          return newState;
        }),
      setGrammarGameQuestions: (questions) =>
        set((state) => {
          const newState = { grammarGameQuestions: questions, updatedAt: Date.now() };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) syncToAPI(state.id, newState);
          return newState;
        }),
      setTestScore: (score) =>
        set((state) => {
          const newState = {
            testScore: score,
            testsCompleted: score > 0 ? state.testsCompleted + 1 : state.testsCompleted,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setTestCompleted: (completed) =>
        set((state) => {
          const newState = {
            testCompleted: completed,
            ...(completed ? { readingTestCompletedAt: Date.now() } : {}),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setTestPoints: (earned, total) =>
        set((state) => {
          const newState = {
            testEarnedPoints: earned,
            testTotalPoints: total,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setTestShowChinese: (show) =>
        set((state) => {
          const newState = {
            testShowChinese: show,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setTestMode: (mode) =>
        set((state) => {
          const newState = {
            testMode: mode,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setVocabularyQuizScore: (score) =>
        set((state) => {
          const newState = {
            vocabularyQuizScore: score,
            vocabQuizzesCompleted: state.vocabQuizzesCompleted + 1,
            vocabQuizCompletedAt: Date.now(),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setSpellingGameBestScore: (score, accuracy) =>
        set((state) => {
          const count = state.spellingGamesCompleted + 1;
          const newState = {
            spellingGameBestScore: Math.max(state.spellingGameBestScore, score),
            spellingGameAccuracy: Math.round(
              (state.spellingGameAccuracy * state.spellingGamesCompleted + accuracy) / count
            ),
            spellingGamesCompleted: count,
            spellingGameCompletedAt: Date.now(),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      incrementFlashcardReviewCount: () =>
        set((state) => {
          const newState = {
            flashcardReviewDates: [...(state.flashcardReviewDates || []), Date.now()],
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      addChatMessage: (message) =>
        set((state) => {
          const newState = {
            chatHistory: [...state.chatHistory, message],
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      removeChatMessage: (id) =>
        set((state) => {
          const newState = {
            chatHistory: state.chatHistory.filter((m) => m.id !== id),
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      clearChatHistory: () =>
        set((state) => {
          const newState = {
            chatHistory: [],
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
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
          syncToHistoryIfNeeded({ ...state, ...newState });
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
          syncToHistoryIfNeeded({ ...state, ...newState });
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
          syncToHistoryIfNeeded({ ...state, ...newState });
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
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setIncludeGlossary: (include) =>
        set((state) => {
          const newState = {
            includeGlossary: include,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setIncludeSentenceAnalysis: (include) =>
        set((state) => {
          const newState = {
            includeSentenceAnalysis: include,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      setSource: (source) =>
        set((state) => {
          const newState = {
            source,
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      clearDerivedData: () =>
        set((state) => {
          const newState = {
            adaptedText: "",
            simplifiedText: "",
            highlightedWords: [],
            analyzedSentences: {},
            glossary: [],
            updatedAt: Date.now(),
          };
          syncToHistoryIfNeeded({ ...state, ...newState });
          if (currentUserId && state.id) {
            syncToAPI(state.id, newState);
          }
          return newState;
        }),
      loadFromRepository: (text) => {
        const newId = nanoid();
        const now = Date.now();
        const newState: Partial<ReadingStore> = {
          ...defaultValues,
          id: newId,
          docTitle: text.title || text.name,
          extractedText: text.extractedText,
          originalImages: text.originalImages,
          source: "repository",
          createdAt: now,
          updatedAt: now,
          status: "idle",
        };
        set(() => newState as ReadingStore);
        // Sync to the in-memory history store immediately so that useAutoSave
        // sees the session as already existing and does not issue a duplicate
        // POST /api/sessions alongside the one fired below.
        syncToHistoryIfNeeded(newState as ReadingStore);
        if (currentUserId) {
          createSessionInAPI({ ...newState } as ReadingStore);
        }
        // Mark this as the last opened session so that on page reload the
        // restore flow in AuthStateManager picks this session instead of the
        // previously-opened one.
        markLastOpenedSession(newId);
      },
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
          originalImages: session.originalImages || [],
        }));
        if (currentUserId && session.id) {
          markSessionCreated(session.id);
        }
      },
    }),
    {
      name: "reading",
      version: 9,
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
          (key) => key !== "originalImages" && key !== "visualizationImage"
        );
        return pick(state, keysToPersist) as ReadingStore & ReadingActions;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.status !== "idle" && state.status !== "error") {
          state.status = "idle";
        }
      },
      migrate: (persistedState) => persistedState as ReadingStore & ReadingActions,
    }
  )
);
