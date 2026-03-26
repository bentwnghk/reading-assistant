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
  HelpCircle,
  Flame,
  BookOpen,
  Brain,
  PenTool,
  BookText,
  TrendingUp,
  Layers,
  Sparkles,
  Medal,
  Search,
  FileEdit,
  FileMinus,
  FileCheck,
  Target,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/style";
import { LeaderboardTable } from "./LeaderboardTable";
import { PersonalStatsCard } from "./PersonalStatsCard";
import { LeaderboardSkeleton, PersonalStatsSkeleton } from "./LeaderboardSkeleton";
import { AchievementsTab } from "./AchievementsTab";
import type { LeaderboardResponse, PersonalStats, LeaderboardScope, SortColumn } from "./types";

interface TeacherClass {
  id: string;
  name: string;
  schoolName?: string;
}

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
  const [weekOffset, setWeekOffset] = useState(0);
  const [tab, setTab]         = useState<"achievements" | "board" | "me">("achievements");

  const [boardData,   setBoardData]   = useState<LeaderboardResponse | null>(null);
  const [personalData, setPersonalData] = useState<PersonalStats | null>(null);
  const [boardLoading,   setBoardLoading]   = useState(false);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [boardError,   setBoardError]   = useState<string | null>(null);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<"achievements" | "leaderboard">("achievements");
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const weekStart = getWeekStart(weekOffset);

  useEffect(() => {
    async function fetchTeacherClasses() {
      if (!userId) return;
      try {
        const res = await fetch("/api/classes");
        if (res.ok) {
          const classes = await res.json() as TeacherClass[];
          setTeacherClasses(classes);
        }
      } catch {
        // Silently fail - teacher may not have classes
      }
    }
    fetchTeacherClasses();
  }, [userId]);

  useEffect(() => {
    setIsSuperAdmin(authSession?.user?.role === "super-admin");
  }, [authSession?.user?.role]);

  // ── Fetch leaderboard ──
  const fetchBoard = useCallback(async () => {
    if (!userId) return;
    setBoardLoading(true);
    setBoardError(null);
    try {
      const params = new URLSearchParams({ scope, sortBy, week: weekStart, limit: "50" });
      if (scope === "class" && selectedClassId && selectedClassId !== "all") {
        params.set("classId", selectedClassId);
      }
      const res = await fetch(`/api/leaderboard?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as LeaderboardResponse;
      setBoardData(data);
    } catch {
      setBoardError(t("leaderboard.empty.description"));
    } finally {
      setBoardLoading(false);
    }
  }, [userId, scope, sortBy, weekStart, selectedClassId, t]);

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
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold">{t("leaderboard.title")}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowHelp(true)}
                title={t("leaderboard.help.title")}
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
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

      {/* ── Week picker (hidden on achievements tab) ── */}
      {tab !== "achievements" && (
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
            {weekOffset === -1 ? t("leaderboard.thisWeek") : t("leaderboard.nextWeek")}
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
      )}

      {/* ── Tabs: Achievements / My Stats / Leaderboard ── */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setTab("achievements")}
          className={cn(
            "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1",
            tab === "achievements"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Medal className="h-3.5 w-3.5" />
          {t("achievements.tabLabel")}
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
        <button
          onClick={() => setTab("board")}
          className={cn(
            "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
            tab === "board"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("leaderboard.tabLabel")}
        </button>
      </div>

      {/* ── Achievements tab ── */}
      {tab === "achievements" && (
        <AchievementsTab />
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

          {/* Class filter for teachers and super-admins */}
          {scope === "class" && (teacherClasses.length > 1 || (isSuperAdmin && teacherClasses.length > 0)) && (
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder={t("leaderboard.selectClass")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("leaderboard.allClasses")}</SelectItem>
                {teacherClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{isSuperAdmin && c.schoolName ? ` (${c.schoolName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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
              scope={scope}
            />
          )}
        </div>
      )}

      {/* ── Help Dialog ── */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              {t("leaderboard.help.title")}
            </DialogTitle>
          </DialogHeader>
          
          {/* Tab buttons */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setHelpTab("achievements")}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                helpTab === "achievements"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("leaderboard.help.tabs.achievements")}
            </button>
            <button
              onClick={() => setHelpTab("leaderboard")}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                helpTab === "leaderboard"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("leaderboard.help.tabs.leaderboard")}
            </button>
          </div>

          {/* Achievements Tab Content */}
          {helpTab === "achievements" && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {t("leaderboard.help.achievements.intro")}
              </p>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.sessions_read.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.sessions_read.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <BookText className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.vocabulary_collected.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.vocabulary_collected.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.flashcard_reviews.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.flashcard_reviews.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Network className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.mindmaps_generated.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.mindmaps_generated.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <FileEdit className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.adapted_texts.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.adapted_texts.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <FileMinus className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.simplified_texts.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.simplified_texts.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <Search className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.sentences_analyzed.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.sentences_analyzed.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.tests_completed.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.tests_completed.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.targeted_practices.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.targeted_practices.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <PenTool className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.spelling_challenges.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.spelling_challenges.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.vocabulary_quizzes.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.vocabulary_quizzes.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.achievements.types.ai_tutor_questions.name")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.achievements.types.ai_tutor_questions.desc")}</p>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t("leaderboard.help.achievements.tip.title")}</span>{" "}
                  {t("leaderboard.help.achievements.tip.content")}
                </p>
              </div>
            </div>
          )}

          {/* Leaderboard Tab Content */}
          {helpTab === "leaderboard" && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {t("leaderboard.help.leaderboard.intro")}
              </p>
              
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.leaderboard.categories.weeklyScore.title")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.leaderboard.categories.weeklyScore.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.leaderboard.categories.streak.title")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.leaderboard.categories.streak.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.leaderboard.categories.testScore.title")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.leaderboard.categories.testScore.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.leaderboard.categories.quizScore.title")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.leaderboard.categories.quizScore.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <PenTool className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.leaderboard.categories.spelling.title")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.leaderboard.categories.spelling.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <BookText className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.leaderboard.categories.vocabulary.title")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.leaderboard.categories.vocabulary.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.leaderboard.categories.flashcards.title")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.leaderboard.categories.flashcards.desc")}</p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t("leaderboard.help.leaderboard.categories.improvement.title")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("leaderboard.help.leaderboard.categories.improvement.desc")}</p>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t("leaderboard.help.leaderboard.tip.title")}</span>{" "}
                  {t("leaderboard.help.leaderboard.tip.content")}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
