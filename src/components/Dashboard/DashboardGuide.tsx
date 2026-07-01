"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Brain,
  Download,
  FileCheck,
  Gamepad2,
  GraduationCap,
  HelpCircle,
  MousePointer,
  PenTool,
  Search,
  Share2,
  Target,
  TrendingUp,
  Upload,
  Clock,
  FileOutput,
  TrashIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/style";

interface DashboardGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type HelpTab = "overview" | "sessions";

const OVERVIEW_ITEMS: { key: string; icon: React.ElementType; bgClass: string; iconClass: string }[] = [
  { key: "statCards", icon: BookOpen, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
  { key: "dailyActivity", icon: BarChart3, bgClass: "bg-indigo-500/10", iconClass: "text-indigo-500" },
  { key: "readingActivity", icon: TrendingUp, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
  { key: "aiFeatures", icon: Brain, bgClass: "bg-purple-500/10", iconClass: "text-purple-500" },
  { key: "readingTestDist", icon: FileCheck, bgClass: "bg-red-500/10", iconClass: "text-red-500" },
  { key: "vocabQuizDist", icon: Brain, bgClass: "bg-cyan-500/10", iconClass: "text-cyan-500" },
  { key: "spellingTrend", icon: PenTool, bgClass: "bg-pink-500/10", iconClass: "text-pink-500" },
  { key: "spellingAccuracy", icon: Target, bgClass: "bg-rose-500/10", iconClass: "text-rose-500" },
  { key: "grammarQuizDist", icon: GraduationCap, bgClass: "bg-fuchsia-500/10", iconClass: "text-fuchsia-500" },
  { key: "grammarGameTrend", icon: Gamepad2, bgClass: "bg-lime-500/10", iconClass: "text-lime-500" },
  { key: "grammarGameAccuracy", icon: Target, bgClass: "bg-emerald-500/10", iconClass: "text-emerald-500" },
  { key: "vocabularyGrowth", icon: BookMarked, bgClass: "bg-indigo-500/10", iconClass: "text-indigo-500" },
];

const SESSION_ITEMS: { key: string; icon: React.ElementType; bgClass: string; iconClass: string }[] = [
  { key: "importSessions", icon: Upload, bgClass: "bg-violet-500/10", iconClass: "text-violet-500" },
  { key: "search", icon: Search, bgClass: "bg-blue-500/10", iconClass: "text-blue-500" },
  { key: "sessionTable", icon: BookOpen, bgClass: "bg-teal-500/10", iconClass: "text-teal-500" },
  { key: "assignHomework", icon: GraduationCap, bgClass: "bg-fuchsia-500/10", iconClass: "text-fuchsia-500" },
  { key: "shareSession", icon: Share2, bgClass: "bg-green-500/10", iconClass: "text-green-500" },
  { key: "loadSession", icon: FileOutput, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
  { key: "exportSession", icon: Download, bgClass: "bg-cyan-500/10", iconClass: "text-cyan-500" },
  { key: "deleteSession", icon: TrashIcon, bgClass: "bg-red-500/10", iconClass: "text-red-500" },
  { key: "pagination", icon: Clock, bgClass: "bg-amber-500/10", iconClass: "text-amber-500" },
];

const FEATURE_ITEMS: { key: string; icon: React.ElementType; bgClass: string; iconClass: string }[] = [
  { key: "timeRange", icon: Clock, bgClass: "bg-teal-500/10", iconClass: "text-teal-500" },
  { key: "scoreBuckets", icon: BarChart3, bgClass: "bg-amber-500/10", iconClass: "text-amber-500" },
  { key: "tooltips", icon: MousePointer, bgClass: "bg-cyan-500/10", iconClass: "text-cyan-500" },
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

export default function DashboardGuide({
  open,
  onOpenChange,
}: DashboardGuideProps) {
  const { t } = useTranslation();
  const [helpTab, setHelpTab] = useState<HelpTab>("overview");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t("dashboard.help.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setHelpTab("overview")}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
              helpTab === "overview"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("dashboard.help.tabs.overview")}
          </button>
          <button
            onClick={() => setHelpTab("sessions")}
            className={cn(
              "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
              helpTab === "sessions"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("dashboard.help.tabs.sessions")}
          </button>
        </div>

        {helpTab === "overview" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.help.overview.intro")}
            </p>

            {OVERVIEW_ITEMS.map((item) => (
              <IconCard
                key={item.key}
                icon={item.icon}
                bgClass={item.bgClass}
                iconClass={item.iconClass}
                name={t(`dashboard.help.overview.items.${item.key}.name`)}
                desc={t(`dashboard.help.overview.items.${item.key}.desc`)}
              />
            ))}

            <h4 className="font-semibold text-sm pt-2">
              {t("dashboard.help.sharedFeatures.title")}
            </h4>
            {FEATURE_ITEMS.map((item) => (
              <IconCard
                key={item.key}
                icon={item.icon}
                bgClass={item.bgClass}
                iconClass={item.iconClass}
                name={t(`dashboard.help.sharedFeatures.items.${item.key}.name`)}
                desc={t(`dashboard.help.sharedFeatures.items.${item.key}.desc`)}
              />
            ))}

            <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("dashboard.help.overview.tip.title")}
                </span>{" "}
                {t("dashboard.help.overview.tip.content")}
              </p>
            </div>
          </div>
        )}

        {helpTab === "sessions" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.help.sessions.intro")}
            </p>

            {SESSION_ITEMS.map((item) => (
              <IconCard
                key={item.key}
                icon={item.icon}
                bgClass={item.bgClass}
                iconClass={item.iconClass}
                name={t(`dashboard.help.sessions.items.${item.key}.name`)}
                desc={t(`dashboard.help.sessions.items.${item.key}.desc`)}
              />
            ))}

            <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("dashboard.help.sessions.tip.title")}
                </span>{" "}
                {t("dashboard.help.sessions.tip.content")}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
