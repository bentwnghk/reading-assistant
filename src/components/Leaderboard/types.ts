export type LeaderboardScope = "class" | "school" | "global"
export type SortColumn =
  | "weekly_score"
  | "reading_streak_days"
  | "avg_test_score"
  | "avg_quiz_score"
  | "avg_spelling_score"
  | "avg_grammar_quiz_score"
  | "avg_grammar_game_score"
  | "total_vocabulary_words"
  | "improvement_score"
  | "total_flashcard_reviews"

export interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  userImage?: string | null
  classId?: string | null
  className?: string | null
  schoolId?: string | null
  schoolName?: string | null
  weeklyScore: number
  streakDays: number
  avgTestScore: number
  avgQuizScore: number
  avgSpellingScore: number
  avgGrammarQuizScore: number
  avgGrammarGameScore: number
  flashcardReviews: number
  totalVocabWords: number
  totalSessions: number
  testsCompleted: number
  quizzesCompleted: number
  improvementScore: number
  priorWeekRank?: number | null
}

export interface LeaderboardResponse {
  rankings: LeaderboardEntry[]
  currentUserRank: LeaderboardEntry | null
  weekStartDate: string
  weekEndDate: string
  scope: LeaderboardScope
}

export interface WeeklyStatsRow {
  userId: string
  weekStartDate: string
  totalSessions: number
  readingStreakDays: number
  avgTestScore: number
  totalFlashcardReviews: number
  avgQuizScore: number
  avgSpellingScore: number
  avgGrammarQuizScore: number
  avgGrammarGameScore: number
  avgGrammarGameAccuracy: number
  totalVocabularyWords: number
  testsCompleted: number
  quizzesCompleted: number
  spellingGamesCompleted: number
  grammarQuizzesCompleted: number
  grammarGamesCompleted: number
  weeklyScore: number
  improvementScore: number
}

export interface PersonalStats {
  currentWeek: WeeklyStatsRow | null
  priorWeek: WeeklyStatsRow | null
  allTime: {
    totalSessions: number
    longestStreak: number
    totalVocabWords: number
    avgAllTimeQuizScore: number
    avgAllTimeTestScore: number
    avgAllTimeGrammarQuizScore: number
    avgAllTimeGrammarGameScore: number
    avgAllTimeGrammarGameAccuracy: number
    avgAllTimeSpellingScore: number
    totalFlashcardReviews: number
  }
  rankInClass: number | null
  rankInSchool: number | null
  rankGlobal: number | null
}
