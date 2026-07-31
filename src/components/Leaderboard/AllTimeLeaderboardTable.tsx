"use client";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { cn } from "@/utils/style";
import { StreakBadge } from "./StreakBadge";
import type { AllTimeLeaderboardEntry, AllTimeSortColumn, LeaderboardScope } from "./types";

const MEDAL_COLORS = ["text-yellow-400", "text-gray-400", "text-amber-600"];
const MEDAL_BG = ["bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
  "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700",
  "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"];

interface AllTimeSortButtonProps {
  column: AllTimeSortColumn;
  current: AllTimeSortColumn;
  onSort: (col: AllTimeSortColumn) => void;
  label: string;
}

function AllTimeSortButton({ column, current, onSort, label }: AllTimeSortButtonProps) {
  const active = column === current;
  return (
    <button
      onClick={() => onSort(column)}
      className={cn(
        "flex items-center gap-0.5 text-xs whitespace-nowrap transition-colors",
        active
          ? "text-primary font-semibold"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {active && <ChevronDown className="h-3 w-3" />}
    </button>
  );
}

interface AllTimeLeaderboardTableProps {
  entries: AllTimeLeaderboardEntry[];
  currentUserId: string;
  sortBy: AllTimeSortColumn;
  onSortChange: (col: AllTimeSortColumn) => void;
  scope: LeaderboardScope;
}

export function AllTimeLeaderboardTable({
  entries,
  currentUserId,
  sortBy,
  onSortChange,
  scope,
}: AllTimeLeaderboardTableProps) {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Sort bar — cumulative-leaning column set (no Improvement, no rank deltas) */}
      <div className="flex items-center gap-3 px-2 pb-1 border-b overflow-x-auto">
        <span className="text-xs text-muted-foreground shrink-0">{t("leaderboard.columns.rank")}:</span>
        {(
          [
            ["all_time_score", "leaderboard.allTime.columns.score"],
            ["longest_streak_days", "leaderboard.allTime.columns.longestStreak"],
            ["total_sessions", "leaderboard.allTime.columns.sessions"],
            ["avg_test_score", "leaderboard.allTime.columns.test"],
            ["avg_quiz_score", "leaderboard.allTime.columns.quiz"],
            ["avg_spelling_score", "leaderboard.allTime.columns.spelling"],
            ["avg_grammar_quiz_score", "leaderboard.allTime.columns.grammarQuiz"],
            ["avg_grammar_game_score", "leaderboard.allTime.columns.grammarGame"],
            ["total_vocabulary_words", "leaderboard.allTime.columns.vocab"],
            ["total_flashcard_reviews", "leaderboard.allTime.columns.flashcards"],
          ] as [AllTimeSortColumn, string][]
        ).map(([col, key]) => (
          <AllTimeSortButton
            key={col}
            column={col}
            current={sortBy}
            onSort={onSortChange}
            label={t(key)}
          />
        ))}
      </div>

      {/* Entries */}
      {entries.map((entry) => {
        const isCurrentUser = entry.userId === currentUserId;
        const isMedal = entry.rank <= 3;

        return (
          <div
            key={entry.userId}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 transition-colors",
              isCurrentUser
                ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                : isMedal
                ? MEDAL_BG[entry.rank - 1]
                : "bg-card hover:bg-muted/50"
            )}
          >
            {/* Rank */}
            <div className="shrink-0 w-8 text-center">
              {isMedal ? (
                <span className={cn("text-xl font-black", MEDAL_COLORS[entry.rank - 1])}>
                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                </span>
              ) : (
                <span className="text-sm font-bold text-muted-foreground tabular-nums">
                  #{entry.rank}
                </span>
              )}
            </div>

            {/* Avatar */}
            <div className="shrink-0">
              {entry.userImage ? (
                <Image
                  src={entry.userImage}
                  alt={entry.userName}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {entry.userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name + class */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn(
                  "font-semibold text-sm truncate",
                  isCurrentUser && "text-primary"
                )}>
                  {entry.userName}
                </span>
                {isCurrentUser && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium shrink-0">
                    {t("leaderboard.rank.you")}
                  </span>
                )}
              </div>
              {scope === "school" && entry.className && (
                <div className="text-xs text-muted-foreground truncate">{entry.className}</div>
              )}
              {scope === "global" && (entry.className || entry.schoolName) && (
                <div className="text-xs text-muted-foreground truncate">
                  {[entry.className, entry.schoolName].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>

            {/* Primary stat — right side, always visible */}
            <div className="text-right shrink-0">
              {sortBy === "longest_streak_days" ? (
                <>
                  <div className="flex justify-end">
                    <StreakBadge days={entry.longestStreak} />
                  </div>
                  <div className="text-xs text-muted-foreground">{t("leaderboard.allTime.columns.longestStreak")}</div>
                </>
              ) : (
                <>
                  <div className={cn(
                    "text-base font-black tabular-nums",
                    isCurrentUser ? "text-primary" : isMedal ? MEDAL_COLORS[entry.rank - 1] : ""
                  )}>
                    {sortBy === "avg_test_score" ? entry.avgTestScore :
                     sortBy === "avg_quiz_score" ? entry.avgQuizScore :
                     sortBy === "avg_spelling_score" ? entry.avgSpellingScore :
                     sortBy === "avg_grammar_quiz_score" ? entry.avgGrammarQuizScore :
                     sortBy === "avg_grammar_game_score" ? entry.avgGrammarGameScore :
                     sortBy === "total_vocabulary_words" ? entry.totalVocabWords :
                     sortBy === "total_flashcard_reviews" ? entry.flashcardReviews :
                     sortBy === "total_sessions" ? entry.totalSessions :
                     entry.allTimeScore}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sortBy === "avg_test_score" ? t("leaderboard.allTime.columns.test") :
                     sortBy === "avg_quiz_score" ? t("leaderboard.allTime.columns.quiz") :
                     sortBy === "avg_spelling_score" ? t("leaderboard.allTime.columns.spelling") :
                     sortBy === "avg_grammar_quiz_score" ? t("leaderboard.allTime.columns.grammarQuiz") :
                     sortBy === "avg_grammar_game_score" ? t("leaderboard.allTime.columns.grammarGame") :
                     sortBy === "total_vocabulary_words" ? t("leaderboard.allTime.columns.vocab") :
                     sortBy === "total_flashcard_reviews" ? t("leaderboard.allTime.columns.flashcards") :
                     sortBy === "total_sessions" ? t("leaderboard.allTime.columns.sessions") :
                     t("leaderboard.allTime.columns.score")}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
