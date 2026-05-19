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

type ReadingTestSkill = "main-idea" | "detail" | "inference" | "vocabulary" | "purpose";

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
  syllabification?: string;
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

type GrammarTopicCategory =
  | "tenses"
  | "conditionals"
  | "passive-voice"
  | "relative-clauses"
  | "reported-speech"
  | "modal-verbs"
  | "articles"
  | "prepositions"
  | "conjunctions"
  | "comparisons"
  | "infinitives-gerunds"
  | "subjunctive"
  | "clause-structure"
  | "other";

interface GrammarTopic {
  id: string;
  name: string;
  nameZh: string;
  category: GrammarTopicCategory;
  cefrLevel: CEFRLevel;
  explanation: string;
  explanationZh: string;
  pattern: string;
  examples: GrammarExample[];
  commonMistakes: string;
  commonMistakesZh: string;
  occurrences: number;
  textSentences: string[];
}

interface GrammarExample {
  sentence: string;
  source: "text" | "generated";
}

interface GrammarQuizQuestion {
  id: string;
  type: "identify" | "fill-in" | "rewrite" | "error-spot";
  topicId: string;
  topicName: string;
  question: string;
  questionZh?: string;
  options?: string[];
  optionsZh?: string[];
  correctAnswer: string;
  userAnswer?: string;
  explanation: string;
  explanationZh?: string;
  points: number;
  earnedPoints?: number;
}

type GrammarQuizState = "idle" | "in-progress" | "completed";

// ── Grammar Games ────────────────────────────────────────────────────────────

type GrammarGameMode = "practice" | "arcade" | "mastery";
type GrammarGameStatus = "setup" | "playing" | "completed";

/** One sentence challenge for the Word Order Scramble game. */
interface GrammarScrambleChallenge {
  topicId: string;
  sentence: string; // correct full sentence; words shuffled client-side
  hint: string;     // the topic's pattern formula shown as a guide
}

/** One slot-fill challenge for the Grammar Workshop game. */
interface GrammarWorkshopChallenge {
  topicId: string;
  template: string;  // sentence with __[label]__ blanks e.g. "She __[auxiliary]__ finished her work."
  slots: { label: string; answer: string }[];
  wordBank: string[]; // correct answers + distractors, pre-shuffled
  explanation: string;
}

/** One error-repair challenge for the Error Surgery game (AI-generated). */
interface ErrorSurgeryChallenge {
  topicId: string;
  sentence: string;    // sentence containing exactly one grammar error
  errorWord: string;   // the exact erroneous token as it appears in the sentence
  correction: string;  // the correct replacement word/phrase
  distractors: string[]; // 3 plausible but wrong alternatives (AI-generated)
  explanation: string;
}

/** One MCQ question shared by Grammar Roulette and Grammar Duel. */
interface GrammarGameQuestion {
  topicId: string;
  question: string;
  options: string[]; // exactly 4 options
  correctIndex: number;
  explanation: string;
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
  flashcardReviewDates?: number[];
  summaryGeneratedAt?: number;
  mindMapGeneratedAt?: number;
  adaptedTextGeneratedAt?: number;
  simplifiedTextGeneratedAt?: number;
  glossaryGeneratedAt?: number;
  spellingGameCompletedAt?: number;
  vocabQuizCompletedAt?: number;
  readingTestCompletedAt?: number;
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
  analyzedAt: number;
}

type UserRole = 'admin' | 'teacher' | 'student';

interface SchoolInfo {
  id: string;
  name: string;
  domain: string;
  userCount?: number;
  createdAt: number;
}

interface UserWithRole {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
  classId?: string;
  className?: string;
  schoolId?: string;
  schoolName?: string;
  createdAt?: number;
}

interface ClassInfo {
  id: string;
  name: string;
  description?: string;
  teacherId?: string;
  teacherName?: string;
  schoolId?: string;
  schoolName?: string;
  studentCount?: number;
  createdAt: number;
}

interface ClassMember {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  studentImage?: string;
  joinedAt: number;
}

interface StudentSessionData {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  docTitle: string;
  studentAge: number;
  extractedText: string;
  summary?: string;
  testScore?: number;
  testCompleted?: boolean;
  vocabularyQuizScore?: number;
  spellingGameBestScore?: number;
  glossaryCount: number;
  progress: number;
  createdAt: number;
  updatedAt: number;
}

interface SchoolSubscriptionStatusResponse {
  hasSubscription: boolean;
  schoolName: string | null;
  status: string;
  plan: string | null;
  quantity: number;
  seatsUsed: number;
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

// ─── Leaderboard types ────────────────────────────────────────────────────────

type LeaderboardActivityType =
  | "session_create"
  | "test_complete"
  | "quiz_complete"
  | "spelling_complete"
  | "flashcard_review"
  | "mindmap_generate"
  | "adapted_text_generate"
  | "simplified_text_generate"
  | "sentence_analyze"
  | "targeted_practice_complete"
  | "glossary_add";

interface ActivityLogEntry {
  id: string;
  userId: string;
  activityType: LeaderboardActivityType;
  sessionId?: string | null;
  score?: number | null;
  details: {
    cardsReviewed?: number;
    wordCount?: number;
    mode?: string;
    difficulty?: string;
    streak?: number;
  };
  createdAt: number;
}

interface LeaderboardWeeklyStats {
  userId: string;
  weekStartDate: string;
  totalSessions: number;
  readingStreakDays: number;
  avgTestScore: number;
  totalFlashcardReviews: number;
  avgQuizScore: number;
  avgSpellingScore: number;
  totalVocabularyWords: number;
  testsCompleted: number;
  quizzesCompleted: number;
  spellingGamesCompleted: number;
  weeklyScore: number;
  improvementScore: number;
}

// ─── Achievement types ────────────────────────────────────────────────────────

type AchievementType =
  | "sessions_read"
  | "vocabulary_collected"
  | "flashcard_reviews"
  | "mindmaps_generated"
  | "adapted_texts"
  | "simplified_texts"
  | "sentences_analyzed"
  | "tests_completed"
  | "targeted_practices"
  | "spelling_challenges"
  | "vocabulary_quizzes"
  | "grammar_analysis"
  | "grammar_quizzes"
  | "grammar_games"
  | "ai_tutor_questions";

interface AchievementMilestone {
  target: number;
  unlocked: boolean;
  unlockedAt?: number;
}

interface Achievement {
  type: AchievementType;
  currentProgress: number;
  milestones: AchievementMilestone[];
  icon: string;
  color: string;
  name: string;
  description: string;
}

interface UserAchievement {
  id: number;
  userId: string;
  achievementType: AchievementType;
  milestone: number;
  unlockedAt: number;
}

interface AchievementsResponse {
  achievements: Achievement[];
  totalUnlocked: number;
  totalMilestones: number;
}

// ─── Text Repository types ────────────────────────────────────────────────────

type TextVisibility = 'class' | 'school' | 'public';

interface RepositoryText {
  id: string;
  name: string;
  title: string;
  extractedText: string;
  originalImages: string[];
  schoolId: string | null;
  classId?: string | null;
  visibility: TextVisibility;
  createdBy: string;
  createdByName?: string | null;
  createdAt: number;
  updatedAt: number;
}

// ── Vocabulary Page types ──────────────────────────────────────────────────────

type VocabularyMasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

type VocabularySelectionStrategy = "due" | "hardest" | "newest" | "random" | "weakest";

type VocabularySource = "own" | "teacher";

interface VocabularyWord {
  id: string;
  word: string;
  syllabification: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseDefinition: string;
  example: string;
  rating: GlossaryRating | null;
  masteryLevel: VocabularyMasteryLevel;
  reviewCount: number;
  correctCount: number;
  lastReviewedAt: number;
  nextReviewAt: number;
  sourceSessionIds: string[];
  source: VocabularySource;
  sharedBy: string | null;
  createdAt: number;
  updatedAt: number;
}

interface VocabularyStats {
  totalWords: number;
  ownWords: number;
  teacherWords: number;
  dueForReview: number;
  mastered: number;
  newWords: number;
  hard: number;
  medium: number;
  easy: number;
  unrated: number;
}

type VocabularyReviewMode = "flashcard" | "quiz" | "spelling";

interface VocabularyReviewResult {
  word: string;
  correct: boolean;
  masteryBefore: number;
  masteryAfter: number;
}

interface VocabularyReviewSession {
  id: string;
  mode: VocabularyReviewMode;
  totalWords: number;
  correctCount: number;
  accuracy: number;
  startedAt: number;
  completedAt: number;
  results?: VocabularyReviewResult[];
}

// ── Review List types ──────────────────────────────────────────────────────

interface ReviewListWord {
  word: string;
  syllabification: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseDefinition: string;
  example: string;
}

interface ReviewList {
  id: string;
  name: string;
  words: ReviewListWord[];
  wordCount: number;
  createdBy: string;
  createdByName: string | null;
  createdAt: number;
  updatedAt: number;
}

interface SharedReviewList {
  id: string;
  senderId: string;
  senderName: string;
  reviewListId: string;
  reviewListName: string;
  wordCount: number;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

interface RepositoryTextListItem {
  id: string;
  name: string;
  title: string;
  previewText: string;
  imageCount: number;
  schoolId: string | null;
  schoolName?: string | null;
  classId?: string | null;
  className?: string | null;
  visibility: TextVisibility;
  createdBy: string;
  createdByName?: string | null;
  createdByRole?: string | null;
  createdAt: number;
  updatedAt: number;
}
