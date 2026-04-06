"use client";
import { useMemo } from "react";
import { useHistoryStore, type ReadingHistory } from "@/store/history";
import { computeDashboardMetrics, type DashboardMetrics } from "@/utils/dashboardMetrics";

export function useDashboardMetrics(): DashboardMetrics {
  const history = useHistoryStore((s) => s.history);

  return useMemo(
    () => computeDashboardMetrics(history as ReadingHistory[]),
    [history]
  );
}
