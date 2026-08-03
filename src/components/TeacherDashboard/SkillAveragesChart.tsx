"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ClassSkillAverage } from "@/lib/skill-profile";

interface SkillAveragesChartProps {
  students: ClassSkillAverage[];
}

const SKILL_LABEL_KEYS: Record<string, string> = {
  "main-idea": "reading.readingTest.skills.mainIdea",
  detail: "reading.readingTest.skills.detail",
  inference: "reading.readingTest.skills.inference",
  vocabulary: "reading.readingTest.skills.vocabulary",
  purpose: "reading.readingTest.skills.purpose",
};

const SKILL_ORDER = ["main-idea", "detail", "inference", "vocabulary", "purpose"];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      {payload.map((entry, i) => (
        <p key={i} className="text-foreground">
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
}

export default function SkillAveragesChart({ students }: SkillAveragesChartProps) {
  const { t } = useTranslation();

  const { radarData, weakestSkill, contributorCount } = useMemo(() => {
    const totals: Record<string, { earned: number; total: number }> = {};
    for (const skill of SKILL_ORDER) totals[skill] = { earned: 0, total: 0 };
    let contributors = 0;
    for (const s of students) {
      let touched = false;
      for (const skill of SKILL_ORDER) {
        const stat = s.profile?.[skill];
        if (stat && typeof stat === "object" && stat.total > 0) {
          totals[skill].earned += Number(stat.earned) || 0;
          totals[skill].total += Number(stat.total) || 0;
          touched = true;
        }
      }
      if (touched) contributors += 1;
    }

    let weakest: string | null = null;
    let weakestAcc = Infinity;
    const radar = SKILL_ORDER.map((skill) => {
      const acc =
        totals[skill].total > 0
          ? Math.round((totals[skill].earned / totals[skill].total) * 100)
          : 0;
      if (totals[skill].total > 0 && acc < weakestAcc) {
        weakestAcc = acc;
        weakest = skill;
      }
      return { skill: t(SKILL_LABEL_KEYS[skill]), accuracy: acc };
    });
    return { radarData: radar, weakestSkill: weakest, contributorCount: contributors };
  }, [students, t]);

  const hasData = contributorCount > 0;
  const weakestLabel = weakestSkill ? t(SKILL_LABEL_KEYS[weakestSkill]) : null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {t("teacherDashboard.charts.skillAverages")}
        </h3>
        {hasData && (
          <span className="text-xs text-muted-foreground">
            {t("teacherDashboard.students")}:{" "}
            <strong className="text-foreground tabular-nums">{contributorCount}</strong>
          </span>
        )}
      </div>
      {!hasData ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm text-center px-4">
          {t("dashboard.charts.skillProfileEmpty")}
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
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
              <Tooltip content={<CustomTooltip />} />
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
