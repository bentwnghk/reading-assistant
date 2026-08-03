"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import type { TeacherSessionData } from "@/lib/users";
import type { ReviewSessionRecord } from "@/lib/vocabulary";
import type { ClassSkillAverage } from "@/lib/skill-profile";
import { computeTeacherDashboardMetrics, type TeacherDashboardMetrics } from "@/utils/teacherDashboardMetrics";

interface UseTeacherDashboardReturn {
  metrics: TeacherDashboardMetrics | null;
  skillAverages: ClassSkillAverage[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTeacherDashboard(classId: string | "all", schoolId?: string | "all"): UseTeacherDashboardReturn {
  const [rawSessions, setRawSessions] = useState<TeacherSessionData[]>([]);
  const [reviewSessions, setReviewSessions] = useState<ReviewSessionRecord[]>([]);
  const [vocabCounts, setVocabCounts] = useState<Record<string, number>>({});
  const [skillAverages, setSkillAverages] = useState<ClassSkillAverage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (schoolId) params.set("schoolId", schoolId);
      const qs = params.toString();
      const response = await fetch(`/api/classes/${classId}/dashboard${qs ? `?${qs}` : ""}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch");
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setRawSessions(data);
        setReviewSessions([]);
        setVocabCounts({});
        setSkillAverages([]);
      } else {
        setRawSessions(data.sessions ?? []);
        setReviewSessions(data.reviewSessions ?? []);
        setVocabCounts(data.vocabCounts ?? {});
        setSkillAverages(data.skillAverages ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [classId, schoolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const metrics = useMemo(() => {
    return computeTeacherDashboardMetrics(rawSessions, reviewSessions, vocabCounts);
  }, [rawSessions, reviewSessions, vocabCounts]);

  return { metrics, skillAverages, loading, error, refetch: fetchData };
}
