"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  RefreshCw,
  ChevronLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";
import { LeaderboardTable } from "./LeaderboardTable";
import { PersonalStatsCard } from "./PersonalStatsCard";
import { LeaderboardSkeleton, PersonalStatsSkeleton } from "./LeaderboardSkeleton";
import type { LeaderboardResponse, PersonalStats, LeaderboardScope, SortColumn } from "./types";

// ─── helpers ──────────────────────────────────────────────────────────────────
function getWeekStart(offsetWeeks = 0): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff + offsetWeeks * 7);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end   = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

// ─── component ────────────────────────────────────────────────────────────────
export function LeaderboardPage() {
  const { t } = useTranslation();
  const { data: authSession } = useSession();
  const router = useRouter();
  const userId = authSession?.user?.id ?? "";

  const [scope, setScope]     = useState<LeaderboardScope>("class");
  const [sortBy, setSortBy]   = useState<SortColumn>("weekly_score");
  const [weekOffset, setWeekOffset] = useState(0);   // 0 = current, -1 = last week
  const [tab, setTab]         = useState<"board" | "me">("board");

  const [boardData,   setBoardData]   = useState<LeaderboardResponse | null>(null);
  const [personalData, setPersonalData] = useState<PersonalStats | null>(null);
  const [boardLoading,   setBoardLoading]   = useState(false);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [boardError,   setBoardError]   = useState<string | null>(null);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const weekStart = getWeekStart(weekOffset);

  // ── Fetch leaderboard ──
  const fetchBoard = useCallback(async () => {
    if (!userId) return;
    setBoardLoading(true);
    setBoardError(null);
    try {
      const params = new URLSearchParams({ scope, sortBy, week: weekStart, limit: "50" });
      const res = await fetch(`/api/leaderboard?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as LeaderboardResponse;
      setBoardData(data);
    } catch {
      setBoardError(t("leaderboard.empty.description"));
    } finally {
      setBoardLoading(false);
    }
  }, [userId, scope, sortBy, weekStart, t]);

  // ── Fetch personal stats ──
  const fetchPersonal = useCallback(async () => {
    if (!userId) return;
    setPersonalLoading(true);
    setPersonalError(null);
    try {
      const params = new URLSearchParams({ week: weekStart });
      const res = await fetch(`/api/leaderboard/me?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as PersonalStats;
      setPersonalData(data);
    } catch {
      setPersonalError(t("leaderboard.empty.description"));
    } finally {
      setPersonalLoading(false);
    }
  }, [userId, weekStart, t]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);
  useEffect(() => {
    if (tab === "me") fetchPersonal();
  }, [tab, fetchPersonal]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBoard(), tab === "me" ? fetchPersonal() : Promise.resolve()]);
    setRefreshing(false);
  };

  const scopes: LeaderboardScope[] = ["class", "school", "global"];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <div>
            <h1 className="text-xl font-bold">{t("leaderboard.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("leaderboard.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            title={t("leaderboard.refresh")}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            title={t("leaderboard.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Week picker ── */}
      <div className="flex items-center justify-between text-sm">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("leaderboard.lastWeek")}
        </button>
        <span className="font-medium tabular-nums">
          {weekOffset === 0 ? t("leaderboard.thisWeek") : formatWeekLabel(weekStart)}
        </span>
        <button
          onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
          disabled={weekOffset >= 0}
          className={cn(
            "flex items-center gap-1 transition-colors",
            weekOffset >= 0
              ? "text-muted-foreground/40 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("leaderboard.thisWeek")}
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </button>
      </div>

      {/* ── Tabs: Board vs My Stats ── */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setTab("board")}
          className={cn(
            "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
            tab === "board"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("leaderboard.title")}
        </button>
        <button
          onClick={() => setTab("me")}
          className={cn(
            "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
            tab === "me"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("leaderboard.myStats")}
        </button>
      </div>

      {/* ── Board tab ── */}
      {tab === "board" && (
        <div className="space-y-4">
          {/* Scope selector */}
          <div className="flex gap-2">
            {scopes.map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-medium rounded-lg border-2 transition-all",
                  scope === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {t(`leaderboard.scope.${s}`)}
              </button>
            ))}
          </div>

          {/* "You" banner when outside top 50 */}
          {boardData?.currentUserRank && !boardData.rankings.some(r => r.userId === userId) && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
              <span className="text-xs text-muted-foreground shrink-0">
                #{boardData.currentUserRank.rank}
              </span>
              <div className="flex-1 text-sm font-medium text-primary">
                {boardData.currentUserRank.userName}
                {" "}
                <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                  {t("leaderboard.rank.you")}
                </span>
              </div>
              <div className="text-right">
                <div className="font-bold tabular-nums text-primary">
                  {boardData.currentUserRank.weeklyScore}
                </div>
                <div className="text-xs text-muted-foreground">{t("leaderboard.columns.score")}</div>
              </div>
            </div>
          )}

          {boardLoading && <LeaderboardSkeleton />}

          {!boardLoading && boardError && (
            <div className="text-center py-12 text-muted-foreground text-sm">{boardError}</div>
          )}

          {!boardLoading && !boardError && boardData && boardData.rankings.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="font-medium">{t("leaderboard.empty.title")}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {scope === "class"
                  ? t("leaderboard.empty.noClass")
                  : t("leaderboard.empty.description")}
              </p>
            </div>
          )}

          {!boardLoading && !boardError && boardData && boardData.rankings.length > 0 && (
            <LeaderboardTable
              entries={boardData.rankings}
              currentUserId={userId}
              sortBy={sortBy}
              onSortChange={setSortBy}
              showClass={scope !== "class"}
            />
          )}
        </div>
      )}

      {/* ── My Stats tab ── */}
      {tab === "me" && (
        <div>
          {personalLoading && <PersonalStatsSkeleton />}
          {!personalLoading && personalError && (
            <div className="text-center py-12 text-muted-foreground text-sm">{personalError}</div>
          )}
          {!personalLoading && !personalError && personalData && (
            <PersonalStatsCard stats={personalData} />
          )}
        </div>
      )}
    </div>
  );
}
