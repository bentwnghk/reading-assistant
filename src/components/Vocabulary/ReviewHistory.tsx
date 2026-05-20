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
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/utils/style";
import { getMasteryColor, getMasteryLabel } from "@/utils/srs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vocabulary/review-sessions?limit=100")
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

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/vocabulary/review-sessions?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setSessions((prev) => prev.filter((s) => s.id !== deleteId));
      if (expandedId === deleteId) {
        setExpandedId(null);
        setDetail(null);
      }
      toast.success(t("vocabulary.reviewHistory.deleted"));
    } catch {
      toast.error(t("vocabulary.reviewHistory.deleteError"));
    }
    setDeleteId(null);
  }, [deleteId, expandedId, t]);

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

  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedSessions = sessions.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

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
    <>
    <div className="space-y-2">
      {pagedSessions.map((session) => {
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
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(session.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
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
                        <span className={cn(
                          "text-xs font-semibold shrink-0",
                          RATING_COLORS[r.rating]
                        )}>
                          {t(`vocabulary.reviewHistory.${r.rating}`)}{r.attempts != null && r.attempts > 1 ? ` ×${r.attempts}` : ""}
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

    {sessions.length > pageSize && (
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t("vocabulary.rowsPerPage")}:
          </span>
          {[10, 20, 30, 50].map((size) => (
            <button
              key={size}
              onClick={() => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              className={cn(
                "px-2 py-0.5 text-xs rounded transition-colors",
                pageSize === size
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {size}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              if (totalPages <= 7) return true;
              if (p === 1 || p === totalPages) return true;
              return Math.abs(p - safePage) <= 1;
            })
            .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) {
                acc.push("ellipsis");
              }
              acc.push(p);
              return acc;
            }, [])
            .map((item, i) =>
              item === "ellipsis" ? (
                <span
                  key={`e${i}`}
                  className="text-xs text-muted-foreground px-1"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setCurrentPage(item)}
                  className={cn(
                    "h-7 w-7 text-xs rounded transition-colors",
                    safePage === item
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {item}
                </button>
              )
            )}
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )}

    <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("vocabulary.reviewHistory.confirmDelete")}</DialogTitle>
          <DialogDescription>
            {t("vocabulary.reviewHistory.confirmDeleteDesc")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            {t("share.close")}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            {t("vocabulary.reviewHistory.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default ReviewHistory;
