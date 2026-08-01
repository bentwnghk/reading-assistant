"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Target, LoaderCircle } from "lucide-react";
import type { SkillProfileResponse } from "@/lib/skill-profile";

const SKILL_LABEL_KEYS: Record<string, string> = {
  "main-idea": "reading.readingTest.skills.mainIdea",
  detail: "reading.readingTest.skills.detail",
  inference: "reading.readingTest.skills.inference",
  vocabulary: "reading.readingTest.skills.vocabulary",
  purpose: "reading.readingTest.skills.purpose",
};

const SKILL_ORDER = ["main-idea", "detail", "inference", "vocabulary", "purpose"];

export function SkillProfileCard() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<SkillProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/skill-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SkillProfileResponse | null) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasData =
    !!profile &&
    Object.values(profile.profile).some((s) => s && typeof s === "object" && s.total > 0);

  const radarData = SKILL_ORDER.map((skill) => {
    const stat = profile?.profile?.[skill];
    const acc = stat && stat.total > 0 ? Math.round((stat.earned / stat.total) * 100) : 0;
    return { skill: t(SKILL_LABEL_KEYS[skill]), accuracy: acc };
  });

  const weakestLabel = profile?.weakestSkill
    ? t(SKILL_LABEL_KEYS[profile.weakestSkill])
    : null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          {t("dashboard.charts.skillProfile")}
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[220px]">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData ? (
        <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground text-center px-4">
          {t("dashboard.charts.skillProfileEmpty")}
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid strokeDasharray="3 3" className="opacity-30" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
              <Radar
                name={t("dashboard.charts.accuracy")}
                dataKey="accuracy"
                stroke="#14b8a6"
                fill="#14b8a6"
                fillOpacity={0.4}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          {weakestLabel && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              {t("dashboard.charts.weakestSkill", { skill: weakestLabel })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
