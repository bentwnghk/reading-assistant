"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  BookMarked,
  Waypoints,
  ClipboardCheck,
  FileText,
  Brain,
  Sparkles,
  ArrowRight,
  Search,
  Highlighter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/store/reading";
import { cn } from "@/utils/style";
import {
  pickRecommendedActivity,
  getIncompleteActivities,
  type LearningActivity,
} from "@/utils/learningActivities";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardCheck,
  SpellCheck: BookOpen,
  Brain,
  Waypoints,
  FileText,
  BookOpen,
  BookMarked,
  Search,
  Highlighter,
};

const COLOR_BG: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
  pink: "bg-pink-500",
  red: "bg-red-500",
  cyan: "bg-cyan-500",
  yellow: "bg-yellow-500",
};

const COLOR_GLOW: Record<string, string> = {
  blue: "shadow-blue-400/50",
  green: "shadow-green-400/50",
  indigo: "shadow-indigo-400/50",
  purple: "shadow-purple-400/50",
  orange: "shadow-orange-400/50",
  teal: "shadow-teal-400/50",
  pink: "shadow-pink-400/50",
  red: "shadow-red-400/50",
  cyan: "shadow-cyan-400/50",
  yellow: "shadow-yellow-400/50",
};

const COLOR_TEXT: Record<string, string> = {
  blue: "text-blue-600 dark:text-blue-300",
  green: "text-green-600 dark:text-green-300",
  indigo: "text-indigo-600 dark:text-indigo-300",
  purple: "text-purple-600 dark:text-purple-300",
  orange: "text-orange-600 dark:text-orange-300",
  teal: "text-teal-600 dark:text-teal-300",
  pink: "text-pink-600 dark:text-pink-300",
  red: "text-red-600 dark:text-red-300",
  cyan: "text-cyan-600 dark:text-cyan-300",
  yellow: "text-yellow-600 dark:text-yellow-300",
};

const COLOR_FROM: Record<string, string> = {
  blue: "from-blue-500/10",
  green: "from-green-500/10",
  indigo: "from-indigo-500/10",
  purple: "from-purple-500/10",
  orange: "from-orange-500/10",
  teal: "from-teal-500/10",
  pink: "from-pink-500/10",
  red: "from-red-500/10",
  cyan: "from-cyan-500/10",
  yellow: "from-yellow-500/10",
};

const COLOR_BORDER: Record<string, string> = {
  blue: "border-blue-500/20",
  green: "border-green-500/20",
  indigo: "border-indigo-500/20",
  purple: "border-purple-500/20",
  orange: "border-orange-500/20",
  teal: "border-teal-500/20",
  pink: "border-pink-500/20",
  red: "border-red-500/20",
  cyan: "border-cyan-500/20",
  yellow: "border-yellow-500/20",
};

function ActivityIcon({ activity }: { activity: LearningActivity }) {
  const IconComp = ICON_MAP[activity.icon] ?? BookOpen;
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={cn(
          "absolute w-20 h-20 rounded-full opacity-20 blur-xl animate-pulse",
          COLOR_BG[activity.color] ?? "bg-primary"
        )}
      />
      <div
        className={cn(
          "relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
          COLOR_BG[activity.color] ?? "bg-primary",
          COLOR_GLOW[activity.color] ?? ""
        )}
      >
        <IconComp className="w-8 h-8 text-white drop-shadow" />
      </div>
    </div>
  );
}

export default function LearningRecommendationDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<LearningActivity | null>(null);
  const [remainingCount, setRemainingCount] = useState(0);
  const dismissedSessionRef = useRef<string | null>(null);
  const checkedRef = useRef(false);

  const { id, extractedText } = useReadingStore();

  useEffect(() => {
    if (checkedRef.current) return;
    if (!id || !extractedText) return;

    if (dismissedSessionRef.current === id) return;

    const state = useReadingStore.getState();
    const recommended = pickRecommendedActivity(state);
    if (!recommended) {
      checkedRef.current = true;
      return;
    }

    const allIncomplete = getIncompleteActivities(state);
    setActivity(recommended);
    setRemainingCount(allIncomplete.length);
    setOpen(true);
    checkedRef.current = true;
  }, [id, extractedText]);

  const handleAccept = useCallback(() => {
    if (!activity) return;
    setOpen(false);

    requestAnimationFrame(() => {
      const element = document.getElementById(activity.sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [activity]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    if (id) {
      dismissedSessionRef.current = id;
    }
  }, [id]);

  if (!activity) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent
        className={cn(
          "max-w-sm text-center overflow-hidden",
          "bg-gradient-to-b",
          COLOR_FROM[activity.color] ?? "from-primary/10",
          "to-background",
          "border",
          COLOR_BORDER[activity.color] ?? ""
        )}
      >
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1",
            COLOR_BG[activity.color] ?? "bg-primary"
          )}
        />

        <div className="flex flex-col items-center gap-4 pt-4 pb-2">
          <ActivityIcon activity={activity} />

          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold text-foreground">
              {t("recommendation.welcomeBack")}
            </DialogTitle>
            <DialogDescription className="text-base font-medium text-foreground/80">
              {t("recommendation.readyToContinue")}
            </DialogDescription>
          </div>

          <div
            className={cn(
              "w-full p-4 rounded-xl border",
              COLOR_BORDER[activity.color] ?? "",
              "bg-background/60 backdrop-blur-sm"
            )}
          >
            <div className="flex items-start gap-3">
              <Sparkles
                className={cn(
                  "w-5 h-5 mt-0.5 shrink-0",
                  COLOR_TEXT[activity.color] ?? "text-primary"
                )}
              />
              <div className="text-left space-y-1">
                <p className="font-semibold text-foreground">
                  {t(activity.titleKey)}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(activity.descriptionKey)}
                </p>
              </div>
            </div>
          </div>

          {remainingCount > 1 && (
            <p className="text-xs text-muted-foreground">
              {t("recommendation.moreActivities", {
                count: remainingCount - 1,
              })}
            </p>
          )}

          <div className="flex flex-col gap-2 w-full">
            <Button
              className={cn(
                "w-full text-white font-semibold gap-2",
                COLOR_BG[activity.color] ?? "bg-primary",
                "hover:opacity-90"
              )}
              onClick={handleAccept}
            >
              {t("recommendation.letsGo")}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleDismiss}
            >
              {t("recommendation.maybeLater")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
