"use client";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  History,
  Layers,
  SpellCheck,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  LoaderCircle,
  Clock,
  Trophy,
} from "lucide-react";
import { cn } from "@/utils/style";
import { getMasteryColor, getMasteryLabel } from "@/utils/srs";

const RATING_COLORS: Record<string, string> = {
  again: "text-rose-500",
  hard: "text-orange-500",
  good: "text-blue-500",
  easy: "text-green-500",
};

function ReviewHistory() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<VocabularyReviewSession[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VocabularyReviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vocabulary/review-sessions?limit=20")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setSessions(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const toggleExpand = useCallback(
    async (sessionId: string) => {
      if (expandedId === sessionId) {
        setExpandedId(null);
        setDetail(null);
        return;
      }
      setExpandedId(sessionId);
      try {
        const res = await fetch(
          `/api/vocabulary/review-sessions?id=${sessionId}`
        );
        if (res.ok) {
          const data = await res.json();
          setDetail(data);
        }
      } catch {
        setDetail(null);
      }
    },
    [expandedId]
  );

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "flashcard":
        return <Layers className="h-4 w-4" />;
      case "quiz":
        return <ClipboardList className="h-4 w-4" />;
      case "spelling":
        return <SpellCheck className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "flashcard":
        return t("vocabulary.reviewHistory.flashcard");
      case "quiz":
        return t("vocabulary.reviewHistory.quiz");
      case "spelling":
        return t("vocabulary.reviewHistory.spelling");
      default:
        return mode;
    }
  };

  const formatDate = (ts: number) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600 dark:text-green-400";
    if (accuracy >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{t("vocabulary.reviewHistory.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const isExpanded = expandedId === session.id;
        return (
          <div
            key={session.id}
            className="border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(session.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-muted-foreground">
                {getModeIcon(session.mode)}
              </span>
              <span className="text-sm font-medium flex-1">
                {getModeLabel(session.mode)}
              </span>
              <span className="text-xs text-muted-foreground">
                {session.totalWords} {t("vocabulary.reviewHistory.words")}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  getAccuracyColor(session.accuracy)
                )}
              >
                {session.accuracy}%
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(session.completedAt)}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isExpanded && detail && (
              <div className="border-t px-4 py-3 bg-muted/20">
                {detail.mode === "flashcard" && detail.ratingCounts ? (
                  <div className="flex items-center gap-3 mb-3">
                    {(["again", "hard", "good", "easy"] as const).map((key) => (
                      <span key={key} className={cn("text-sm font-medium", RATING_COLORS[key])}>
                        {t(`vocabulary.reviewHistory.${key}`)}: {detail.ratingCounts![key]}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {session.correctCount} {t("vocabulary.reviewHistory.correct")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">
                        {session.totalWords - session.correctCount}{" "}
                        {t("vocabulary.reviewHistory.incorrect")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className={cn("text-sm font-medium", getAccuracyColor(session.accuracy))}>
                        {session.accuracy}% {t("vocabulary.reviewHistory.accuracy")}
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {detail.results?.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm py-0.5"
                    >
                      {detail.mode === "flashcard" && r.rating ? (
                        <span className={cn("text-xs font-medium w-12 shrink-0", RATING_COLORS[r.rating])}>
                          {t(`vocabulary.reviewHistory.${r.rating}`)}
                        </span>
                      ) : r.correct ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      )}
                      <span className="font-medium">{r.word}</span>
                      <span
                        className={cn(
                          "inline-flex items-center justify-center px-1 py-0.5 rounded text-[9px] font-medium",
                          getMasteryColor(r.masteryAfter)
                        )}
                      >
                        {getMasteryLabel(r.masteryAfter)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ReviewHistory;
