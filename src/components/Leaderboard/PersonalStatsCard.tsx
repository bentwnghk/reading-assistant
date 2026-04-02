"use client";
import { useTranslation } from "react-i18next";
import { Trophy, Flame, BookOpen, Target, Layers, TrendingUp, Medal, Gamepad2, BarChart3 } from "lucide-react";
import { cn } from "@/utils/style";
import { ImprovementIndicator } from "./ImprovementIndicator";
import type { PersonalStats } from "./types";

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  highlight?: boolean;
}

function StatItem({ icon, label, value, sub, highlight }: StatItemProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-1",
        highlight
          ? "bg-primary/5 border-primary/30"
          : "bg-card"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className={cn("text-2xl font-bold tabular-nums", highlight && "text-primary")}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

interface PersonalStatsCardProps {
  stats: PersonalStats;
}

export function PersonalStatsCard({ stats }: PersonalStatsCardProps) {
  const { t } = useTranslation();
  const cw = stats.currentWeek;
  const pw = stats.priorWeek;

  const scoreDelta = cw && pw ? cw.weeklyScore - pw.weeklyScore : null;
  const streakDelta = cw && pw ? cw.readingStreakDays - pw.readingStreakDays : null;

  if (!cw && !stats.allTime.totalSessions) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{t("leaderboard.personal.noStats")}</p>
      </div>
    );
  }

  const ranks = [
    { label: t("leaderboard.personal.rankInClass"),  value: stats.rankInClass,  icon: <Medal className="h-3.5 w-3.5" /> },
    { label: t("leaderboard.personal.rankInSchool"), value: stats.rankInSchool, icon: <Medal className="h-3.5 w-3.5" /> },
    { label: t("leaderboard.personal.rankGlobal"),   value: stats.rankGlobal,   icon: <Trophy className="h-3.5 w-3.5" /> },
  ].filter(r => r.value !== null && r.value !== undefined)

  return (
    <div className="space-y-4">
      {/* Rank chips */}
      {ranks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ranks.map(r => (
            <span
              key={r.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold"
            >
              {r.icon}
              {r.label}: #{r.value}
            </span>
          ))}
        </div>
      )}

      {/* Current week grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatItem
          icon={<Trophy className="h-3.5 w-3.5" />}
          label={t("leaderboard.stats.weeklyScore")}
          value={cw?.weeklyScore ?? 0}
          sub={scoreDelta !== null ? <ImprovementIndicator value={scoreDelta} /> : undefined}
          highlight
        />
        <StatItem
          icon={<Flame className="h-3.5 w-3.5" />}
          label={t("leaderboard.stats.streak")}
          value={
            <span className={cn(
              (cw?.readingStreakDays ?? 0) >= 7 ? "text-orange-500" :
              (cw?.readingStreakDays ?? 0) >= 3 ? "text-yellow-500" : ""
            )}>
              {cw?.readingStreakDays ?? 0}
            </span>
          }
          sub={
            <span className="flex items-center gap-1">
              {streakDelta !== null && <ImprovementIndicator value={streakDelta} size="sm" />}
              <span>{t("leaderboard.stats.streakDays", { count: cw?.readingStreakDays ?? 0 })}</span>
            </span>
          }
        />
        <StatItem
          icon={<Target className="h-3.5 w-3.5" />}
          label={t("leaderboard.stats.testScore")}
          value={Math.round(cw?.avgTestScore ?? 0)}
          sub={cw?.testsCompleted
            ? `${cw.testsCompleted} ${t("leaderboard.stats.testsCompleted")}`
            : undefined}
        />
        <StatItem
          icon={<BookOpen className="h-3.5 w-3.5" />}
          label={t("leaderboard.stats.quizScore")}
          value={Math.round(cw?.avgQuizScore ?? 0)}
          sub={cw?.quizzesCompleted
            ? `${cw.quizzesCompleted} ${t("leaderboard.stats.quizzesCompleted")}`
            : undefined}
        />
        <StatItem
          icon={<Gamepad2 className="h-3.5 w-3.5" />}
          label={t("leaderboard.stats.spellingScore")}
          value={Math.round(cw?.avgSpellingScore ?? 0)}
          sub={cw?.spellingGamesCompleted
            ? `${cw.spellingGamesCompleted} ${t("leaderboard.stats.spellingGamesCompleted")}`
            : undefined}
        />
        <StatItem
          icon={<Layers className="h-3.5 w-3.5" />}
          label={t("leaderboard.stats.flashcards")}
          value={cw?.totalFlashcardReviews ?? 0}
        />
        <StatItem
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label={t("leaderboard.stats.vocabWords")}
          value={cw?.totalVocabularyWords ?? 0}
        />
      </div>

      {/* All-time row */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("leaderboard.personal.allTime")}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">{t("leaderboard.personal.totalSessions")}</div>
            <div className="font-bold text-lg tabular-nums">{stats.allTime.totalSessions}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("leaderboard.personal.longestStreak")}</div>
            <div className="font-bold text-lg tabular-nums text-orange-500">{stats.allTime.longestStreak}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("leaderboard.personal.totalVocab")}</div>
            <div className="font-bold text-lg tabular-nums">{stats.allTime.totalVocabWords}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("leaderboard.personal.avgTestScore")}</div>
            <div className="font-bold text-lg tabular-nums">{stats.allTime.avgAllTimeTestScore}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("leaderboard.personal.totalFlashcards")}</div>
            <div className="font-bold text-lg tabular-nums">{stats.allTime.totalFlashcardReviews}</div>
          </div>
        </div>
      </div>

      {/* Weekly activity chart */}
      {stats.weeklyActivity && stats.weeklyActivity.daily.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            <BarChart3 className="h-3.5 w-3.5" />
            {t("leaderboard.personal.weeklyActivity")}
          </div>
          <div className="flex items-end gap-[2px] h-24">
            {stats.weeklyActivity.daily.map((d) => {
              const maxCount = Math.max(...stats.weeklyActivity!.daily.map((x) => x.count), 1);
              const height = (d.count / maxCount) * 100;
              return (
                <div
                  key={d.date}
                  className="flex-1 bg-primary/80 rounded-t-sm min-w-[3px] transition-all hover:bg-primary"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${d.date}: ${d.count}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Activity breakdown */}
      {stats.weeklyActivity && stats.weeklyActivity.breakdown.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("leaderboard.personal.activityBreakdown")}
          </div>
          <div className="space-y-1.5">
            {stats.weeklyActivity.breakdown.map((item) => {
              const pct = stats.weeklyActivity!.total > 0
                ? Math.round((item.count / stats.weeklyActivity!.total) * 100)
                : 0;
              return (
                <div key={item.activity_type} className="flex items-center gap-2">
                  <span className="text-sm w-5 text-center">
                    {getActivityIcon(item.activity_type)}
                  </span>
                  <span className="text-xs flex-1 truncate">
                    {getActivityLabel(item.activity_type, t)}
                  </span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right tabular-nums">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, string> = {
  session_create: "\u{1F4D6}",
  test_complete: "\u{1F4DD}",
  quiz_complete: "\u{1F9E0}",
  spelling_complete: "\u{270F}\u{FE0F}",
  flashcard_review: "\u{1F4DA}",
  mindmap_generate: "\u{1F5FA}\u{FE0F}",
  adapted_text_generate: "\u{270D}\u{FE0F}",
  simplified_text_generate: "\u{270D}\u{FE0F}",
  sentence_analyze: "\u{1F50D}",
  targeted_practice_complete: "\u{1F3AF}",
  glossary_add: "\u{1F4D2}",
  ai_tutor_question: "\u{1F916}",
};

function getActivityIcon(type: string): string {
  return ACTIVITY_ICONS[type] || "\u{1F4CB}";
}

function getActivityLabel(type: string, t: (key: string) => string): string {
  const key = `leaderboard.activityTypes.${type}`;
  const translated = t(key);
  return translated !== key ? translated : type;
}
