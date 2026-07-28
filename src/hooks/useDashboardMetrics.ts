"use client";
import { useEffect, useMemo, useState } from "react";
import { useHistoryStore, type ReadingHistory } from "@/store/history";
import { computeDashboardMetrics, type DashboardMetrics } from "@/utils/dashboardMetrics";

export function useDashboardMetrics(): DashboardMetrics {
  const history = useHistoryStore((s) => s.history);
  const [reviewSessions, setReviewSessions] = useState<VocabularyReviewSession[]>([]);
  const [vocabularyWordCount, setVocabularyWordCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch("/api/vocabulary/review-sessions?limit=100")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setReviewSessions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setReviewSessions([]);
      });

    fetch("/api/vocabulary?type=stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setVocabularyWordCount(typeof data?.totalWords === "number" ? data.totalWords : undefined);
      })
      .catch(() => {
        setVocabularyWordCount(undefined);
      });
  }, []);

  return useMemo(
    () => computeDashboardMetrics(history as ReadingHistory[], reviewSessions, vocabularyWordCount),
    [history, reviewSessions, vocabularyWordCount],
  );
}
