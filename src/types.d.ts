interface ImageSource {
  url: string;
  description?: string;
}

type ReadingTestQuestionType = 
  | "multiple-choice" 
  | "true-false-not-given" 
  | "short-answer" 
  | "inference" 
  | "vocab-context" 
  | "referencing";

type ReadingTestSkill = "main-idea" | "detail" | "inference" | "vocabulary" | "purpose" | "sequencing";

type DifficultyLevel = "foundation" | "intermediate" | "advanced";

interface ReadingTestQuestion {
  id: string;
  type: ReadingTestQuestionType;
  question: string;
  questionZh?: string;
  options?: string[];
  optionsZh?: string[];
  correctAnswer: string;
  userAnswer?: string;
  explanation?: string;
  explanationZh?: string;
  skillTested: ReadingTestSkill;
  paragraphRef?: number;
  difficultyLevel: DifficultyLevel;
  points: number;
  earnedPoints?: number;
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

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  selectedText?: string;
  images?: string[];
}

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface TextDifficultyResult {
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  avgSentenceLength: number;
  avgWordLength: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  automatedReadabilityIndex: number;
  colemanLiauIndex: number;
  smogIndex: number;
  cefrLevel: CEFRLevel;
  cefrScore: number;
  cefrDistribution: Record<string, number>;
  estimatedLexile: string;
  analyzedAt: number;
}

interface AIDifficultyResult {
  lexileLevel: string;
  cefrLevel: string;
  reasoning: {
    vocabulary: string;
    sentenceStructure: string;
    overallAssessment: string;
  };
  suitableFor: {
    ageRange: string;
    gradeLevel: string;
    description: string;
  };
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  analyzedAt: number;
}
