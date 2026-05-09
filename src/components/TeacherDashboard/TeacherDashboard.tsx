"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Loader2, BarChart3, FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useTeacherDashboard } from "@/hooks/useTeacherDashboard";
import {
  SCORE_BUCKETS,
} from "@/utils/teacherDashboardMetrics";
import type { ClassInfo, SchoolInfo } from "@/lib/users";
import DailyActivityChart from "./DailyActivityChart";
import ReadingTextsChart from "./ReadingTextsChart";
import TotalVocabularyChart from "./TotalVocabularyChart";
import AvgProgressChart from "./AvgProgressChart";
import AiFeaturesChart from "./AiFeaturesChart";
import ScoreDistChart from "./ScoreDistChart";
import SpellingScoreChart from "./SpellingScoreChart";
import GrammarGameChart from "./GrammarGameChart";
import VocabularyGrowthChart from "./VocabularyGrowthChart";

interface TeacherDashboardProps {
  open: boolean;
  onClose: () => void;
}

export default function TeacherDashboard({ open, onClose }: TeacherDashboardProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const role = session?.user?.role || "student";
  const isSuperAdmin = role === "super-admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const isTeacher = role === "teacher";

  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [schools, setSchools] = useState<SchoolInfo[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  // Refs for each chart card — order matches the JSX render order below
  const chartRefs = useRef<(HTMLDivElement | null)[]>(Array(12).fill(null));

  const filteredClasses = useMemo(() => {
    if (!isSuperAdmin || selectedSchoolId === "all") return allClasses;
    return allClasses.filter((c) => c.schoolId === selectedSchoolId);
  }, [allClasses, selectedSchoolId, isSuperAdmin]);

  const { metrics, loading, error } = useTeacherDashboard(
    selectedClassId,
    isSuperAdmin ? selectedSchoolId : undefined
  );

  const loadSchools = useCallback(async () => {
    try {
      const response = await fetch("/api/schools");
      if (response.ok) {
        const data: SchoolInfo[] = await response.json();
        setSchools(data);
      }
    } catch (err) {
      console.error("Failed to load schools:", err);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const response = await fetch("/api/classes");
      if (response.ok) {
        const data: ClassInfo[] = await response.json();
        setAllClasses(data);
        if (isAdmin) {
          setSelectedClassId("all");
        } else if (data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (open && (isTeacher || isAdmin)) {
      loadClasses();
      if (isSuperAdmin) {
        loadSchools();
      }
    }
  }, [open, isTeacher, isAdmin, isSuperAdmin, loadClasses, loadSchools]);

  useEffect(() => {
    if (isSuperAdmin && selectedSchoolId !== "all") {
      const hasClass = filteredClasses.some((c) => c.id === selectedClassId);
      if (!hasClass) {
        setSelectedClassId("all");
      }
    }
  }, [selectedSchoolId, filteredClasses, selectedClassId, isSuperAdmin]);

  function handleClose(dialogOpen: boolean) {
    if (!dialogOpen) onClose();
  }

  // ── Chart capture & Excel export ──────────────────────────────────────────
  const CHART_LABELS = [
    t("teacherDashboard.charts.dailyActivity"),
    t("teacherDashboard.charts.readingTexts"),
    t("teacherDashboard.charts.totalVocabulary"),
    t("teacherDashboard.charts.avgProgress"),
    t("teacherDashboard.charts.aiFeatures"),
    `${t("dashboard.scores.readingTest")} — ${t("teacherDashboard.excel.scoreDistribution")}`,
    `${t("dashboard.scores.vocabQuiz")} — ${t("teacherDashboard.excel.scoreDistribution")}`,
    `${t("dashboard.scores.grammarQuiz")} — ${t("teacherDashboard.excel.scoreDistribution")}`,
    `${t("dashboard.scores.grammarGame")} — ${t("teacherDashboard.excel.scoreDistribution")}`,
    `${t("dashboard.scores.grammarGameAccuracy")} — ${t("teacherDashboard.excel.scoreDistribution")}`,
    t("teacherDashboard.charts.spellingScore"),
    t("teacherDashboard.charts.vocabularyGrowth"),
  ];

  async function captureChartAsBase64(el: HTMLDivElement): Promise<{ base64: string; width: number; height: number }> {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    return { base64, width: canvas.width, height: canvas.height };
  }

  async function handleExport() {
    if (!metrics) return;
    setIsExporting(true);
    try {
      const { exportTeacherDashboardToExcel } = await import("@/utils/teacherDashboardExcel");

      // Capture chart images in order
      const chartImages = [];
      for (let i = 0; i < chartRefs.current.length; i++) {
        const el = chartRefs.current[i];
        if (el) {
          const img = await captureChartAsBase64(el);
          chartImages.push({ title: CHART_LABELS[i], ...img });
        }
      }

      // Determine class/school names for the filename and report header
      const selectedClass = allClasses.find((c) => c.id === selectedClassId);
      const selectedSchool = schools.find((s) => s.id === selectedSchoolId);

      await exportTeacherDashboardToExcel({
        metrics,
        chartImages,
        className: selectedClass?.name,
        schoolName: selectedSchool?.name,
      });
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-lg:max-w-screen-sm max-w-screen-xl gap-2 max-sm:p-3 overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t("teacherDashboard.title")}
          </DialogTitle>
          <DialogDescription className="text-left">
            {t("teacherDashboard.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 mb-2">
          {isSuperAdmin && (
            <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder={t("teacherDashboard.selectSchool")} />
              </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-3rem)]">
                <SelectItem value="all">{t("teacherDashboard.allSchools")}</SelectItem>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={t("teacherDashboard.selectClass")} />
            </SelectTrigger>
            <SelectContent>
              {isAdmin && (
                <SelectItem value="all">{t("teacherDashboard.allClasses")}</SelectItem>
              )}
              {isSuperAdmin && selectedSchoolId === "all"
                ? schools.map((school) => {
                    const schoolClasses = filteredClasses.filter((c) => c.schoolId === school.id);
                    if (schoolClasses.length === 0) return null;
                    return (
                      <SelectGroup key={school.id}>
                        <SelectLabel>{school.name}</SelectLabel>
                        {schoolClasses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.studentCount || 0})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })
                : filteredClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.studentCount || 0})
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {error && <span className="text-xs text-destructive">{error}</span>}

          {metrics && metrics.students.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-1.5"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {isExporting
                ? t("teacherDashboard.exporting")
                : t("teacherDashboard.exportExcel")}
            </Button>
          )}
        </div>

        {!selectedClassId ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t("teacherDashboard.selectClassPrompt")}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !metrics || metrics.students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">{t("teacherDashboard.empty")}</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div ref={(el) => { chartRefs.current[0] = el; }}>
              <DailyActivityChart students={metrics.students} />
            </div>

            <div ref={(el) => { chartRefs.current[1] = el; }}>
              <ReadingTextsChart
                students={metrics.students}
                classTotal={metrics.classTotalReadingTexts}
                classAvg={metrics.classAvgReadingTexts}
              />
            </div>

            <div ref={(el) => { chartRefs.current[2] = el; }}>
              <TotalVocabularyChart
                students={metrics.students}
                classTotal={metrics.classTotalVocabulary}
                classAvg={metrics.classAvgVocabulary}
              />
            </div>

            <div ref={(el) => { chartRefs.current[3] = el; }}>
              <AvgProgressChart
                students={metrics.students}
                classAvg={metrics.classAvgProgress}
              />
            </div>

            <div ref={(el) => { chartRefs.current[4] = el; }}>
              <AiFeaturesChart
                students={metrics.students}
                classTotal={metrics.classTotalAiUsage}
                classAvg={metrics.classAvgAiUsage}
              />
            </div>

            <div ref={(el) => { chartRefs.current[5] = el; }}>
              <ScoreDistChart
                title={t("dashboard.scores.readingTest")}
                students={metrics.students}
                scoreKey="testScores"
                buckets={SCORE_BUCKETS}
                classAvg={metrics.classAvgTestScore}
              />
            </div>

            <div ref={(el) => { chartRefs.current[6] = el; }}>
              <ScoreDistChart
                title={t("dashboard.scores.vocabQuiz")}
                students={metrics.students}
                scoreKey="quizScores"
                buckets={SCORE_BUCKETS}
                classAvg={metrics.classAvgQuizScore}
              />
            </div>

            <div ref={(el) => { chartRefs.current[7] = el; }}>
              <ScoreDistChart
                title={t("dashboard.scores.grammarQuiz")}
                students={metrics.students}
                scoreKey="grammarQuizScores"
                buckets={SCORE_BUCKETS}
                classAvg={metrics.classAvgGrammarQuizScore}
              />
            </div>

            <div ref={(el) => { chartRefs.current[8] = el; }}>
              <GrammarGameChart
                students={metrics.students}
                classAvg={metrics.classAvgGrammarGameScore}
              />
            </div>

            <div ref={(el) => { chartRefs.current[9] = el; }}>
              <ScoreDistChart
                title={t("dashboard.scores.grammarGameAccuracy")}
                students={metrics.students}
                scoreKey="grammarGameAccuracies"
                buckets={SCORE_BUCKETS}
                classAvg={metrics.classAvgGrammarGameAccuracy}
              />
            </div>

            <div ref={(el) => { chartRefs.current[10] = el; }}>
              <SpellingScoreChart
                students={metrics.students}
                classAvg={metrics.classAvgSpellingScore}
              />
            </div>

            <div ref={(el) => { chartRefs.current[11] = el; }}>
              <VocabularyGrowthChart students={metrics.students} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
