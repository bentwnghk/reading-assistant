"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  BookOpen,
  BookText,
  Brain,
  Calendar,
  Clock,
  Download,
  Eye,
  FileCheck,
  Gamepad2,
  GraduationCap,
  HelpCircle,
  Layers,
  LineChart,
  MousePointer,
  Palette,
  PenTool,
  School,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/style";

interface TeacherDashboardGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type HelpTab = "charts" | "functions";

const CHART_ITEMS: { key: string; icon: React.ElementType; bgClass: string; iconClass: string }[] = [
  { key: "dailyActivity", icon: Calendar, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
  { key: "readingTexts", icon: BookOpen, bgClass: "bg-green-500/10", iconClass: "text-green-500" },
  { key: "totalVocabulary", icon: BookText, bgClass: "bg-emerald-500/10", iconClass: "text-emerald-500" },
  { key: "avgProgress", icon: TrendingUp, bgClass: "bg-teal-500/10", iconClass: "text-teal-500" },
  { key: "aiFeatures", icon: Sparkles, bgClass: "bg-purple-500/10", iconClass: "text-purple-500" },
  { key: "readingTestDist", icon: FileCheck, bgClass: "bg-sky-500/10", iconClass: "text-sky-500" },
  { key: "vocabQuizDist", icon: Brain, bgClass: "bg-indigo-500/10", iconClass: "text-indigo-500" },
  { key: "grammarQuizDist", icon: GraduationCap, bgClass: "bg-fuchsia-500/10", iconClass: "text-fuchsia-500" },
  { key: "grammarGameScore", icon: Gamepad2, bgClass: "bg-amber-500/10", iconClass: "text-amber-500" },
  { key: "grammarGameAccuracy", icon: Target, bgClass: "bg-lime-500/10", iconClass: "text-lime-500" },
  { key: "spellingScore", icon: PenTool, bgClass: "bg-pink-500/10", iconClass: "text-pink-500" },
  { key: "spellingAccuracy", icon: Target, bgClass: "bg-rose-500/10", iconClass: "text-rose-500" },
  { key: "vocabularyGrowth", icon: LineChart, bgClass: "bg-cyan-500/10", iconClass: "text-cyan-500" },
];

const FUNCTION_ITEMS: { key: string; icon: React.ElementType; bgClass: string; iconClass: string }[] = [
  { key: "schoolFilter", icon: School, bgClass: "bg-violet-500/10", iconClass: "text-violet-500" },
  { key: "classFilter", icon: Users, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
  { key: "dateNavigation", icon: Calendar, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
  { key: "timePeriod", icon: Clock, bgClass: "bg-teal-500/10", iconClass: "text-teal-500" },
  { key: "timeRange", icon: Clock, bgClass: "bg-indigo-500/10", iconClass: "text-indigo-500" },
  { key: "studentToggle", icon: Eye, bgClass: "bg-purple-500/10", iconClass: "text-purple-500" },
  { key: "quartileColors", icon: Palette, bgClass: "bg-rose-500/10", iconClass: "text-rose-500" },
  { key: "scoreBuckets", icon: BarChart3, bgClass: "bg-amber-500/10", iconClass: "text-amber-500" },
  { key: "referenceLines", icon: Layers, bgClass: "bg-green-500/10", iconClass: "text-green-500" },
  { key: "tooltips", icon: MousePointer, bgClass: "bg-cyan-500/10", iconClass: "text-cyan-500" },
  { key: "excelExport", icon: Download, bgClass: "bg-emerald-500/10", iconClass: "text-emerald-500" },
];

function IconCard({
  icon: Icon,
  bgClass,
  iconClass,
  name,
  desc,
}: {
  icon: React.ElementType;
  bgClass: string;
  iconClass: string;
  name: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
      <div className={cn("shrink-0 w-10 h-10 rounded-full flex items-center justify-center", bgClass)}>
        <Icon className={cn("h-5 w-5", iconClass)} />
      </div>
      <div>
        <h4 className="font-semibold text-sm">{name}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export default function TeacherDashboardGuide({
  open,
  onOpenChange,
}: TeacherDashboardGuideProps) {
  const { t } = useTranslation();
  const [helpTab, setHelpTab] = useState<HelpTab>("charts");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t("teacherDashboard.help.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setHelpTab("charts")}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
              helpTab === "charts"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("teacherDashboard.help.tabs.charts")}
          </button>
          <button
            onClick={() => setHelpTab("functions")}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
              helpTab === "functions"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("teacherDashboard.help.tabs.functions")}
          </button>
        </div>

        {helpTab === "charts" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("teacherDashboard.help.charts.intro")}
            </p>

            {CHART_ITEMS.map((item) => (
              <IconCard
                key={item.key}
                icon={item.icon}
                bgClass={item.bgClass}
                iconClass={item.iconClass}
                name={t(`teacherDashboard.help.charts.items.${item.key}.name`)}
                desc={t(`teacherDashboard.help.charts.items.${item.key}.desc`)}
              />
            ))}

            <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("teacherDashboard.help.charts.tip.title")}
                </span>{" "}
                {t("teacherDashboard.help.charts.tip.content")}
              </p>
            </div>
          </div>
        )}

        {helpTab === "functions" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("teacherDashboard.help.functions.intro")}
            </p>

            {FUNCTION_ITEMS.map((item) => (
              <IconCard
                key={item.key}
                icon={item.icon}
                bgClass={item.bgClass}
                iconClass={item.iconClass}
                name={t(`teacherDashboard.help.functions.items.${item.key}.name`)}
                desc={t(`teacherDashboard.help.functions.items.${item.key}.desc`)}
              />
            ))}

            <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("teacherDashboard.help.functions.tip.title")}
                </span>{" "}
                {t("teacherDashboard.help.functions.tip.content")}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
