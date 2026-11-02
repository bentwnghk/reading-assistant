"use client";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";
import { useReadingStore } from "@/store/reading";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/utils/style";

/**
 * Compact "Your Age" slider + "Estimated Level" badge, bound to the reading
 * store's `studentAge` — the single source of truth. Every placement (the
 * Settings dialog's User Info tab, the expandable User Info item in the
 * navigation sidebar/drawer) reads and writes the same store field, so the
 * values stay in sync automatically. `setStudentAge` keeps the persistence
 * behaviour the old main-page User Information section had (persisted store,
 * history sync and per-session API sync).
 */
function AgeSlider() {
  const { t } = useTranslation();
  const sliderId = useId();
  const studentAge = useReadingStore((s) => s.studentAge);
  const setStudentAge = useReadingStore((s) => s.setStudentAge);

  function getFormLevel(age: number): string {
    const levelMap: Record<number, string> = {
      8: t("reading.levels.primary3"),
      9: t("reading.levels.primary4"),
      10: t("reading.levels.primary5"),
      11: t("reading.levels.primary6"),
      12: t("reading.levels.form1"),
      13: t("reading.levels.form2"),
      14: t("reading.levels.form3"),
      15: t("reading.levels.form4"),
      16: t("reading.levels.form5"),
      17: t("reading.levels.form6"),
      18: t("reading.levels.dse"),
    };
    return levelMap[age] || t("reading.levels.form6");
  }

  function getLevelColor(age: number): string {
    if (age <= 11) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    if (age <= 14) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex flex-wrap justify-between items-center gap-x-2">
          <Label htmlFor={sliderId}>
            {t("reading.studentInfo.ageLabel")}
          </Label>
          <span className="text-lg font-bold text-primary whitespace-nowrap">
            {studentAge} {t("reading.studentInfo.yearsOld")}
          </span>
        </div>
        <Slider
          id={sliderId}
          min={8}
          max={18}
          step={1}
          value={[studentAge]}
          onValueChange={(value) => setStudentAge(value[0])}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>8</span>
          <span>13</span>
          <span>18</span>
        </div>
      </div>
      {/* flex-wrap: in English the label + level badge don't fit narrow
          surfaces (sidebar/drawer panel, narrow dialog viewports) on one
          line — the badge drops to its own line instead of overflowing. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 p-2 bg-muted/50 rounded-md">
        <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {t("reading.studentInfo.estimatedLevel")}:
        </span>
        <span className={cn(
          "px-2 py-0.5 rounded text-sm font-medium whitespace-nowrap",
          getLevelColor(studentAge)
        )}>
          {getFormLevel(studentAge)}
        </span>
      </div>
    </div>
  );
}

export default AgeSlider;
