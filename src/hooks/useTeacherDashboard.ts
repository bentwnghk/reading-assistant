"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import type { TeacherSessionData } from "@/lib/users";
import { computeTeacherDashboardMetrics, type TeacherDashboardMetrics } from "@/utils/teacherDashboardMetrics";

interface UseTeacherDashboardReturn {
  metrics: TeacherDashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTeacherDashboard(classId: string | "all"): UseTeacherDashboardReturn {
  const [rawSessions, setRawSessions] = useState<TeacherSessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/classes/${classId}/dashboard`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch");
      }
      const data: TeacherSessionData[] = await response.json();
      setRawSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metrics = useMemo(() => {
    return computeTeacherDashboardMetrics(rawSessions);
  }, [rawSessions]);

  return { metrics, loading, error, refetch: fetchData };
}
