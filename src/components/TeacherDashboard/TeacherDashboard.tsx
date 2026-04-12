"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Loader2, BarChart3 } from "lucide-react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { useTeacherDashboard } from "@/hooks/useTeacherDashboard";
import {
  SCORE_BUCKETS,
} from "@/utils/teacherDashboardMetrics";
import type { ClassInfo } from "@/lib/users";
import DailyActivityChart from "./DailyActivityChart";
import ReadingTextsChart from "./ReadingTextsChart";
import TotalVocabularyChart from "./TotalVocabularyChart";
import AvgProgressChart from "./AvgProgressChart";
import AiFeaturesChart from "./AiFeaturesChart";
import ScoreDistChart from "./ScoreDistChart";
import SpellingScoreChart from "./SpellingScoreChart";
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

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const { metrics, loading, error } = useTeacherDashboard(selectedClassId);

  const loadClasses = useCallback(async () => {
    try {
      const response = await fetch("/api/classes");
      if (response.ok) {
        const data: ClassInfo[] = await response.json();
        setClasses(data);
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
    }
  }, [open, isTeacher, isAdmin, loadClasses]);

  function handleClose(dialogOpen: boolean) {
    if (!dialogOpen) onClose();
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

        <div className="flex items-center gap-3 mb-2">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={t("teacherDashboard.selectClass")} />
            </SelectTrigger>
            <SelectContent>
              {isAdmin && (
                <SelectItem value="all">{t("teacherDashboard.allClasses")}</SelectItem>
              )}
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.studentCount || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {error && <span className="text-xs text-destructive">{error}</span>}
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
            <DailyActivityChart students={metrics.students} />

            <ReadingTextsChart
              students={metrics.students}
              classTotal={metrics.classTotalReadingTexts}
              classAvg={metrics.classAvgReadingTexts}
            />

            <TotalVocabularyChart
              students={metrics.students}
              classTotal={metrics.classTotalVocabulary}
              classAvg={metrics.classAvgVocabulary}
            />

            <AvgProgressChart
              students={metrics.students}
              classAvg={metrics.classAvgProgress}
            />

            <AiFeaturesChart
              students={metrics.students}
              classTotal={metrics.classTotalAiUsage}
              classAvg={metrics.classAvgAiUsage}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScoreDistChart
                title={t("dashboard.scores.readingTest")}
                students={metrics.students}
                scoreKey="testScores"
                buckets={SCORE_BUCKETS}
                classAvg={metrics.classAvgTestScore}
              />
              <ScoreDistChart
                title={t("dashboard.scores.vocabQuiz")}
                students={metrics.students}
                scoreKey="quizScores"
                buckets={SCORE_BUCKETS}
                classAvg={metrics.classAvgQuizScore}
              />
              <SpellingScoreChart
                students={metrics.students}
                classAvg={metrics.classAvgSpellingScore}
              />
            </div>

            <VocabularyGrowthChart students={metrics.students} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
