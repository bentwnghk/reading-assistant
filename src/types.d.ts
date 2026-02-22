interface ImageSource {
  url: string;
  description?: string;
}

interface ReadingTestQuestion {
  id: string;
  type: "multiple-choice" | "true-false" | "short-answer";
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
  explanation?: string;
}

interface GlossaryEntry {
  word: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseDefinition: string;
  example?: string;
}

type GlossaryRating = "easy" | "medium" | "hard";

interface SentenceAnalysis {
  sentence: string;
  analysis: string;
  createdAt: number;
}

type SpellingGameMode = "listen-type" | "scramble" | "fill-blanks" | "mixed";
type SpellingDifficulty = "easy" | "medium" | "hard";

interface SpellingWordChallenge {
  word: string;
  englishDefinition: string;
  chineseDefinition: string;
  shuffledLetters: string[];
  blankedWord: string;
  blankPositions: number[];
  revealedHints: number[];
}

interface SpellingGameResult {
  mode: SpellingGameMode;
  difficulty: SpellingDifficulty;
  score: number;
  maxStreak: number;
  totalWords: number;
  correctWords: number;
  completedAt: number;
}

interface VocabularyQuizQuestion {
  id: string;
  type: "word-to-definition" | "definition-to-word" | "fill-blank";
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer?: string;
  wordRef: string;
}

interface ReadingSession {
  id: string;
  title: string;
  studentAge: number;
  originalImages?: string[];
  extractedText: string;
  summary: string;
  adaptedText: string;
  simplifiedText: string;
  highlightedWords: string[];
  mindMap: string;
  readingTest: ReadingTestQuestion[];
  glossary: GlossaryEntry[];
  glossaryRatings?: Record<string, GlossaryRating>;
  testScore?: number;
  testCompleted?: boolean;
  vocabularyQuizScore?: number;
  spellingGameBestScore?: number;
  createdAt: number;
  updatedAt: number;
}

interface PartialJson {
  value: JSONValue | undefined;
  state:
    | "undefined-input"
    | "successful-parse"
    | "repaired-parse"
    | "failed-parse";
}
