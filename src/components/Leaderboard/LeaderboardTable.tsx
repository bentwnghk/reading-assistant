"use client";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown } from "lucide-react";
import Image from "next/image";
import { cn } from "@/utils/style";
import { StreakBadge } from "./StreakBadge";
import { ImprovementIndicator } from "./ImprovementIndicator";
import type { LeaderboardEntry, SortColumn } from "./types";

const MEDAL_COLORS = ["text-yellow-400", "text-gray-400", "text-amber-600"];
const MEDAL_BG     = ["bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
                      "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700",
                      "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"];

interface SortButtonProps {
  column: SortColumn;
  current: SortColumn;
  onSort: (col: SortColumn) => void;
  label: string;
}

function SortButton({ column, current, onSort, label }: SortButtonProps) {
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

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  sortBy: SortColumn;
  onSortChange: (col: SortColumn) => void;
  showClass?: boolean;
}

export function LeaderboardTable({
  entries,
  currentUserId,
  sortBy,
  onSortChange,
  showClass = false,
}: LeaderboardTableProps) {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Sort bar */}
      <div className="flex items-center gap-3 px-2 pb-1 border-b overflow-x-auto">
        <span className="text-xs text-muted-foreground shrink-0">{t("leaderboard.columns.rank")}:</span>
        {(
          [
            ["weekly_score", "leaderboard.columns.score"],
            ["reading_streak_days", "leaderboard.columns.streak"],
            ["avg_test_score", "leaderboard.columns.test"],
            ["avg_quiz_score", "leaderboard.columns.quiz"],
            ["avg_spelling_score", "leaderboard.columns.spelling"],
            ["total_vocabulary_words", "leaderboard.columns.vocab"],
            ["total_flashcard_reviews", "leaderboard.columns.flashcards"],
            ["improvement_score", "leaderboard.columns.improvement"],
          ] as [SortColumn, string][]
        ).map(([col, key]) => (
          <SortButton
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
        const rankDelta = entry.priorWeekRank != null
          ? entry.priorWeekRank - entry.rank
          : null;

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
              {showClass && entry.className && (
                <div className="text-xs text-muted-foreground truncate">{entry.className}</div>
              )}
              {/* Rank trend */}
              {rankDelta !== null && (
                <div className="mt-0.5">
                  {rankDelta === 0 ? (
                    <span className="text-xs text-muted-foreground">{t("leaderboard.rank.same")}</span>
                  ) : rankDelta > 0 ? (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
                      <ChevronUp className="h-3 w-3" />
                      {t("leaderboard.rank.up", { count: rankDelta })}
                    </span>
                  ) : (
                    <span className="text-xs text-red-500 flex items-center gap-0.5">
                      <ChevronDown className="h-3 w-3" />
                      {t("leaderboard.rank.down", { count: Math.abs(rankDelta) })}
                    </span>
                  )}
                </div>
              )}
              {rankDelta === null && entry.priorWeekRank === null && (
                <span className="text-xs text-muted-foreground">{t("leaderboard.rank.new")}</span>
              )}
            </div>

            {/* Score */}
            <div className="text-right shrink-0">
              <div className={cn(
                "text-base font-black tabular-nums",
                isCurrentUser ? "text-primary" : isMedal ? MEDAL_COLORS[entry.rank - 1] : ""
              )}>
                {entry.weeklyScore}
              </div>
              <div className="text-xs text-muted-foreground">{t("leaderboard.columns.score")}</div>
            </div>

            {/* Streak */}
            <div className="shrink-0 hidden sm:block text-center min-w-[40px]">
              <StreakBadge days={entry.streakDays} />
              <div className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.columns.streak")}</div>
            </div>

            {/* Dynamic highlighted stat based on sortBy */}
            {sortBy !== "weekly_score" && sortBy !== "reading_streak_days" && (
              <div className="shrink-0 hidden md:block text-center min-w-[52px]">
                {sortBy === "avg_test_score" && (
                  <>
                    <div className="font-semibold text-sm tabular-nums">{entry.avgTestScore}</div>
                    <div className="text-xs text-muted-foreground">{t("leaderboard.columns.test")}</div>
                  </>
                )}
                {sortBy === "avg_quiz_score" && (
                  <>
                    <div className="font-semibold text-sm tabular-nums">{entry.avgQuizScore}</div>
                    <div className="text-xs text-muted-foreground">{t("leaderboard.columns.quiz")}</div>
                  </>
                )}
                {sortBy === "avg_spelling_score" && (
                  <>
                    <div className="font-semibold text-sm tabular-nums">{entry.avgSpellingScore}</div>
                    <div className="text-xs text-muted-foreground">{t("leaderboard.columns.spelling")}</div>
                  </>
                )}
                {sortBy === "total_vocabulary_words" && (
                  <>
                    <div className="font-semibold text-sm tabular-nums">{entry.totalVocabWords}</div>
                    <div className="text-xs text-muted-foreground">{t("leaderboard.columns.vocab")}</div>
                  </>
                )}
                {sortBy === "total_flashcard_reviews" && (
                  <>
                    <div className="font-semibold text-sm tabular-nums">{entry.flashcardReviews}</div>
                    <div className="text-xs text-muted-foreground">{t("leaderboard.columns.flashcards")}</div>
                  </>
                )}
                {sortBy === "improvement_score" && (
                  <>
                    <ImprovementIndicator value={entry.improvementScore} />
                    <div className="text-xs text-muted-foreground">{t("leaderboard.columns.improvement")}</div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
