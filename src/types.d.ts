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

type ReadingTestQuestionCounts = Record<ReadingTestQuestionType, number>;

type ReadingTestSkill = "main-idea" | "detail" | "inference" | "vocabulary" | "purpose";

interface SkillStat {
  earned: number;
  total: number;
  correct: number;
  count: number;
}

type SkillBreakdown = Record<ReadingTestSkill, SkillStat>;

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

interface PreTeachWord {
  word: string;
  syllabification?: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseDefinition: string;
}

interface PreReadingData {
  activationPrompts: string[];
  activationPromptZh?: string[];
  predictionPrompt: string;
  purpose: string;
  preTeachWords: PreTeachWord[];
  backgroundNote: string;
  generatedAt: number;
}

interface CollocationChunk {
  id: string;
  chunk: string;
  pattern: string;
  meaning: string;
  meaningZh: string;
  contrastNote?: string;
  example: string;
  textOccurrences: number;
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
  // ── On-demand "Full Lesson" enrichment (Tier 1 + Tier 2) ──
  // All optional: present only after the user clicks "Load Full Lesson" for this topic.
  whenToUse?: string;
  whenToUseZh?: string;
  signalWords?: string[];
  forms?: { affirmative: string; negative: string; question: string };
  compareWith?: {
    structure: string;
    difference: string;
    differenceZh: string;
    example: string;
  };
  pronunciationTips?: string;
  commonMistakePairs?: { wrong: string; right: string; explanation: string }[];
  ccqs?: { question: string; answer: string }[];
  guidedPractice?: GrammarGuidedPracticeItem[];
}

interface GrammarExample {
  sentence: string;
  source: "text" | "generated";
}

/** One inline practice item for the Lessons tab "Quick Practice" section. */
interface GrammarGuidedPracticeItem {
  prompt: string;
  type: "fill-in" | "transformation" | "choice";
  options?: string[];
  acceptableAnswers: string[];
  explanation: string;
}

/** Shape returned by the on-demand grammar-lesson AI call. */
interface GrammarLessonEnrichment {
  whenToUse: string;
  whenToUseZh: string;
  signalWords: string[];
  forms: { affirmative: string; negative: string; question: string };
  compareWith: { structure: string; difference: string; differenceZh: string; example: string };
  pronunciationTips: string;
  commonMistakePairs: { wrong: string; right: string; explanation: string }[];
  ccqs: { question: string; answer: string }[];
  guidedPractice: GrammarGuidedPracticeItem[];
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

// ── Multiplayer Spelling Battle types ───────────────────────────────────────
// Mirrored in realtime/src/game/types.ts (the realtime package is standalone
// and does not import from src/). Keep both sides in sync.

/** A single word in a battle's word list. Definitions feed the hint system.
 * `blankPositions` / `shuffledLetters` / `perWordMode` are precomputed by the
 * server (authoritative) so every player sees identical blanks/tiles. */
interface BattleWord {
  word: string;
  englishDefinition?: string;
  chineseDefinition?: string;
  syllabification?: string;
  partOfSpeech?: string;
  example?: string;
  /** fill-blanks: letter indices blanked out (sorted ascending). */
  blankPositions?: number[];
  /** scramble: the shuffled letter tiles shown to players. */
  shuffledLetters?: string[];
  /** mixed: the per-word mode assigned to this word. */
  perWordMode?: SpellingGameMode;
}

type WordSourceType = "glossary" | "vocabulary" | "review-list" | "selected";

/** Filter applied when the word source is the host's vocabulary bank. */
type VocabularyFilter = "all" | "due-for-review" | "hard-words";

interface WordSource {
  type: WordSourceType;
  /** glossary: reading_session id; review-list: review_lists id. */
  sourceId?: string;
  /** vocabulary bank only. */
  filter?: VocabularyFilter;
  /** selected: inline word texts chosen by the host (validated against user_vocabulary). */
  words?: string[];
}

interface BattleRoomConfig {
  source: WordSource;
  difficulty: SpellingDifficulty;
  /** Game mode (listen-type / scramble / fill-blanks / mixed). */
  gameMode: SpellingGameMode;
  /** Requested word count; server caps to the number actually available. */
  wordCount: number;
  timed: boolean;
  classBattle: boolean;
}

interface BattlePlayerSummary {
  userId: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  isHost: boolean;
  /** present = connected; disconnected = within reconnect grace window. */
  status: "present" | "disconnected";
  score: number;
  streak: number;
  correctCount: number;
  finished: boolean;
}

type BattleRoomStatus = "lobby" | "countdown" | "playing" | "finished";

interface BattleRoomState {
  roomCode: string;
  status: BattleRoomStatus;
  config: BattleRoomConfig;
  hostId: string;
  players: BattlePlayerSummary[];
  /** Resolved (capped) word count — may be < config.wordCount. */
  actualWordCount: number;
  classBattle: boolean;
  currentIndex: number;
}

// ── Battle event payloads (mirror realtime/src/game/types.ts) ───────────────

interface BattleCreateRoomPayload {
  config: BattleRoomConfig;
  /** For class battles: the target class id (teacher must own it). */
  targetClassId?: string;
}

interface BattleJoinRoomPayload {
  code: string;
}

interface BattleSetSourcePayload {
  source: WordSource;
  wordCount: number;
}

interface BattlePlayerJoinedPayload {
  player: BattlePlayerSummary;
}

interface BattlePlayerLeftPayload {
  userId: string;
  newHostId: string | null;
}

interface BattleClassBattleAvailablePayload {
  roomCode: string;
  hostName: string | null;
  className: string | null;
  actualWordCount: number;
  difficulty: SpellingDifficulty;
  gameMode: SpellingGameMode;
}

type BattleRoomErrorCode =
  | "room_not_found"
  | "room_full"
  | "room_not_in_lobby"
  | "already_in_room"
  | "not_host"
  | "too_many_rooms"
  | "invalid_source"
  | "not_connected"
  | "class_not_allowed"
  | "internal_error";

interface BattleRoomErrorPayload {
  /** Stable error code the client can i18n-translate. */
  code: BattleRoomErrorCode;
  message: string;
}

// ── Battle game-loop event payloads (mirror realtime/src/game/types.ts) ─────

interface BattleCountdownPayload {
  n: number;
}

interface BattleWordSubmitPayload {
  index: number;
  answer: string;
  /** Client timestamp — logged but NOT used for scoring (server clock is authoritative). */
  submittedAt: number;
  hintsUsed: number;
}

interface BattleWordStartPayload {
  index: number;
  total: number;
  word: string;
  englishDefinition?: string;
  chineseDefinition?: string;
  syllabification?: string;
  partOfSpeech?: string;
  example?: string;
  durationMs: number;
  startedAt: number;
  timed: boolean;
  /** Actual per-word mode (for "mixed", differs per word). */
  gameMode: SpellingGameMode;
  /** fill-blanks: letter indices blanked out (sorted ascending). */
  blankPositions?: number[];
  /** scramble: the shuffled letter tiles shown to players. */
  shuffledLetters?: string[];
}

interface BattlePlayerProgressPayload {
  userId: string;
  index: number;
  correct: boolean;
  pointsAwarded: number;
  total: number;
  streak: number;
}

interface BattleWordEndResult {
  userId: string;
  correct: boolean;
  pointsAwarded: number;
  total: number;
  streak: number;
  /** false if the player timed out / didn't submit. */
  submitted: boolean;
}

interface BattleWordEndPayload {
  index: number;
  word: string;
  results: BattleWordEndResult[];
}

interface BattleRankingEntry {
  rank: number;
  userId: string;
  name: string | null;
  image: string | null;
  total: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  isHost: boolean;
}

interface BattleLiveRankingPayload {
  ranking: BattleRankingEntry[];
  index: number;
}

interface BattleGameEndPayload {
  finalRanking: BattleRankingEntry[];
  totalWords: number;
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
  preReading?: PreReadingData | null;
  preReadingImage?: string;
  preReadingImageGeneratedAt?: number;
  preReadingGeneratedAt?: number;
  studentPrediction?: string;
  predictionRating?: number | null;
  skillBreakdown?: SkillBreakdown | null;
  collocations?: CollocationChunk[];
  collocationsGeneratedAt?: number;
  summary: string;
  adaptedText: string;
  simplifiedText: string;
  highlightedWords: string[];
  mindMap: string;
  visualizationImage: string;
  readingTest: ReadingTestQuestion[];
  glossary: GlossaryEntry[];
  glossaryRatings?: Record<string, GlossaryRating>;
  testScore?: number;
  testCompleted?: boolean;
  vocabularyQuizScore?: number;
  vocabularyQuiz?: VocabularyQuizQuestion[];
  spellingGameBestScore?: number;
  flashcardReviewDates?: number[];
  summaryGeneratedAt?: number;
  mindMapGeneratedAt?: number;
  visualizationGeneratedAt?: number;
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
  promptContent?: string;
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

// ─── AI reading-text generator ────────────────────────────────────────────────

/** Raw JSON object returned by the model for an AI-generated reading text. */
interface GeneratedReadingText {
  title: string;
  text_type: string;
  cefr_level: CEFRLevel;
  word_count: number;
  estimated_fk_grade: number;
  new_vocabulary: string[];
  body: string[];
}

/**
 * Quality-control metadata for an AI-generated reading text. Persisted to the
 * `generated_text_meta` JSONB column so the "regenerate at level" flow and
 * long-term QC analysis survive reloads.
 */
interface GeneratedTextMeta {
  topic: string;
  description?: string;
  textType: string;
  textTypeLabel: string;
  targetWordCount: number;
  cefrLevel: CEFRLevel;
  ageGeneratedFor: number;
  generatedAt: number;
  actualWordCount?: number;
  estimatedFkGrade?: number;
  newVocabulary?: string[];
}

type UserRole = 'super-admin' | 'admin' | 'teacher' | 'student';

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

type AssignmentStatus = 'active' | 'archived';

interface Assignment {
  id: string;
  teacherId: string;
  teacherName?: string;
  title: string;
  description?: string;
  subject?: string;
  sourceSessionId?: string;
  sourceDocTitle?: string;
  dueDate?: string | null;
  status: AssignmentStatus;
  studentCount?: number;
  avgProgress?: number;
  /** Only populated for student-side queries (their own working session id). */
  studentSessionId?: string;
  /** Only populated for student-side queries (their cached scores). */
  testScore?: number | null;
  vocabularyQuizScore?: number | null;
  spellingGameBestScore?: number | null;
  spellingGameAccuracy?: number | null;
  grammarQuizScore?: number | null;
  grammarGameBestScore?: number | null;
  grammarGameAccuracy?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string | null;
  studentEmail?: string | null;
  studentImage?: string | null;
  studentSessionId?: string | null;
  progress: number;
  testScore?: number | null;
  testCompleted: boolean;
  vocabularyQuizScore?: number | null;
  spellingGameBestScore?: number | null;
  spellingGameAccuracy?: number | null;
  grammarQuizScore?: number | null;
  grammarGameBestScore?: number | null;
  grammarGameAccuracy?: number | null;
  lastViewedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
}

/**
 * A saved, reusable group of student ids. Shared school-wide — any
 * teacher/admin in the same school can see and use a preset. Only the
 * creator (or an admin/super-admin) can edit or delete it.
 */
interface AssignmentPreset {
  id: string;
  teacherId: string;
  createdByName?: string | null;
  schoolId: string;
  name: string;
  description?: string;
  studentIds: string[];
  studentCount: number;
  createdAt: string;
  updatedAt: string;
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
  spellingGameAccuracy?: number;
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
  | "glossary_add"
  | "pre_reading_generate"
  | "pre_reading_image_generate"
  | "collocations_generate";

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
  srsCounts: { hard: number; medium: number };
  masteryLevel: VocabularyMasteryLevel;
  reviewCount: number;
  correctCount: number;
  lastReviewedAt: number;
  nextReviewAt: number;
  sourceSessionIds: string[];
  source: VocabularySource;
  entryType?: "word" | "phrase";
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

type SRSAction = "again" | "hard" | "good" | "easy";

interface VocabularyReviewResult {
  word: string;
  correct: boolean;
  masteryBefore: number;
  masteryAfter: number;
  rating?: SRSAction;
  attempts?: number;
}

interface VocabularyRatingCounts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

interface VocabularyReviewSession {
  id: string;
  mode: VocabularyReviewMode;
  totalWords: number;
  correctCount: number;
  accuracy: number;
  ratingCounts?: VocabularyRatingCounts;
  startedAt: number;
  completedAt: number;
  /** "word" (default) or "phrase" — scopes the review queue. */
  entryType?: "word" | "phrase";
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
