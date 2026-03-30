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
  Library,
  RefreshCw,
  LoaderCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";
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

type DialogStep = "choices" | "repository-loading" | "repository-preview";

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
  amber: "bg-amber-500",
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
  amber: "shadow-amber-400/50",
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
  amber: "text-amber-600 dark:text-amber-300",
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
  amber: "border-amber-500/20",
};

const REPO_COLOR = "amber";

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
  const [step, setStep] = useState<DialogStep>("choices");
  const [activity, setActivity] = useState<LearningActivity | null>(null);
  const [remainingCount, setRemainingCount] = useState(0);
  const [hasIncompleteActivities, setHasIncompleteActivities] = useState(false);
  const [recommendedText, setRecommendedText] =
    useState<RepositoryTextListItem | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);
  const dismissedSessionRef = useRef<string | null>(null);
  const checkedRef = useRef(false);
  const allTextsRef = useRef<RepositoryTextListItem[]>([]);

  const { id, extractedText } = useReadingStore();

  useEffect(() => {
    if (checkedRef.current) return;
    if (dismissedSessionRef.current === id) return;

    const state = useReadingStore.getState();
    const hasSession = !!(id && extractedText);
    const recommended = hasSession ? pickRecommendedActivity(state) : null;
    const allIncomplete = hasSession ? getIncompleteActivities(state) : [];

    if (recommended) {
      setActivity(recommended);
      setRemainingCount(allIncomplete.length);
      setHasIncompleteActivities(true);
      setStep("choices");
    } else {
      setHasIncompleteActivities(false);
      setStep("choices");
    }

    setOpen(true);
    checkedRef.current = true;
  }, [id, extractedText]);

  const handleContinueLearning = useCallback(() => {
    if (!activity) return;
    setOpen(false);
    requestAnimationFrame(() => {
      const el = document.getElementById(activity.sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [activity]);

  const handleChooseRepository = useCallback(async () => {
    setStep("repository-loading");
    try {
      let texts = allTextsRef.current;
      if (texts.length === 0) {
        const res = await fetch("/api/repository");
        if (!res.ok) throw new Error("Failed to fetch");
        texts = await res.json();
        allTextsRef.current = texts;
      }
      if (texts.length === 0) {
        toast.info(t("recommendation.noTextsAvailable"));
        setStep("choices");
        setOpen(false);
        return;
      }
      const randomText = texts[Math.floor(Math.random() * texts.length)];
      setRecommendedText(randomText);
      setStep("repository-preview");
    } catch {
      toast.error(t("reading.repository.fetchError"));
      setStep("choices");
    }
  }, [t]);

  const handlePickAnother = useCallback(() => {
    const texts = allTextsRef.current;
    if (texts.length <= 1) return;
    let candidate: RepositoryTextListItem;
    do {
      candidate = texts[Math.floor(Math.random() * texts.length)];
    } while (candidate.id === recommendedText?.id);
    setRecommendedText(candidate);
  }, [recommendedText]);

  const handleStartReading = useCallback(async () => {
    if (!recommendedText) return;
    setLoadingStart(true);
    try {
      const res = await fetch(`/api/repository/${recommendedText.id}`);
      if (!res.ok) throw new Error("Failed to load");
      const fullText: RepositoryText = await res.json();
      useReadingStore.getState().loadFromRepository(fullText);
      setOpen(false);
    } catch {
      toast.error(t("reading.repository.loadError"));
    } finally {
      setLoadingStart(false);
    }
  }, [recommendedText, t]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    setStep("choices");
    setRecommendedText(null);
    if (id) {
      dismissedSessionRef.current = id;
    }
  }, [id]);

  const activityColor = activity?.color ?? "amber";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleDismiss();
      }}
    >
      <DialogContent className="max-w-sm text-center overflow-hidden">
        {step === "choices" && (
          <>
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-1",
                hasIncompleteActivities
                  ? (COLOR_BG[activityColor] ?? "bg-primary")
                  : "bg-amber-500"
              )}
            />

            <div className="flex flex-col items-center gap-4 pt-4 pb-2">
              {hasIncompleteActivities && activity ? (
                <ActivityIcon activity={activity} />
              ) : (
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-20 h-20 rounded-full opacity-20 blur-xl animate-pulse bg-amber-500" />
                  <div className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-amber-500 shadow-amber-400/50">
                    <Library className="w-8 h-8 text-white drop-shadow" />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-foreground">
                  {hasIncompleteActivities
                    ? t("recommendation.welcomeBack")
                    : t("recommendation.welcome")}
                </DialogTitle>
                <DialogDescription className="text-base font-medium text-foreground/80">
                  {hasIncompleteActivities
                    ? t("recommendation.readyToContinue")
                    : t("recommendation.readyToRead")}
                </DialogDescription>
              </div>

              {hasIncompleteActivities && activity && (
                <button
                  type="button"
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    COLOR_BORDER[activityColor] ?? "",
                    "bg-background/60 backdrop-blur-sm"
                  )}
                  onClick={handleContinueLearning}
                >
                  <div className="flex items-start gap-3">
                    <Sparkles
                      className={cn(
                        "w-5 h-5 mt-0.5 shrink-0",
                        COLOR_TEXT[activityColor] ?? "text-primary"
                      )}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold text-foreground">
                        {t("recommendation.continueLearning")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t(activity.titleKey)}
                      </p>
                      {remainingCount > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {t("recommendation.moreActivities", {
                            count: remainingCount - 1,
                          })}
                        </p>
                      )}
                    </div>
                    <ArrowRight
                      className={cn(
                        "w-4 h-4 mt-1 shrink-0",
                        COLOR_TEXT[activityColor] ?? "text-primary"
                      )}
                    />
                  </div>
                </button>
              )}

              <button
                type="button"
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-all",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  COLOR_BORDER[REPO_COLOR],
                  "bg-background/60 backdrop-blur-sm"
                )}
                onClick={handleChooseRepository}
              >
                <div className="flex items-start gap-3">
                  <Library
                    className={cn(
                      "w-5 h-5 mt-0.5 shrink-0",
                      COLOR_TEXT[REPO_COLOR]
                    )}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-foreground">
                      {t("recommendation.readFromRepository")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("recommendation.readFromRepositoryDesc")}
                    </p>
                  </div>
                  <ArrowRight
                    className={cn(
                      "w-4 h-4 mt-1 shrink-0",
                      COLOR_TEXT[REPO_COLOR]
                    )}
                  />
                </div>
              </button>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={handleDismiss}
              >
                {t("recommendation.maybeLater")}
              </Button>
            </div>
          </>
        )}

        {step === "repository-loading" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <LoaderCircle className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm text-muted-foreground">
              {t("recommendation.loadingText")}
            </p>
          </div>
        )}

        {step === "repository-preview" && recommendedText && (
          <>
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />

            <div className="flex flex-col items-center gap-4 pt-4 pb-2">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full opacity-20 blur-xl animate-pulse bg-amber-500" />
                <div className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-amber-500 shadow-amber-400/50">
                  <Library className="w-8 h-8 text-white drop-shadow" />
                </div>
              </div>

              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-foreground">
                  {t("recommendation.repositoryPicked")}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {t("recommendation.repositoryPickedDesc")}
                </DialogDescription>
              </div>

              <div
                className={cn(
                  "w-full p-4 rounded-xl border",
                  COLOR_BORDER[REPO_COLOR],
                  "bg-background/60 backdrop-blur-sm"
                )}
              >
                <div className="text-left space-y-2">
                  {recommendedText.name && recommendedText.title && recommendedText.name !== recommendedText.title && (
                    <p className="text-xs text-muted-foreground">
                      {recommendedText.name}
                    </p>
                  )}
                  <p className="font-semibold text-foreground text-base">
                    {recommendedText.title || recommendedText.name}
                  </p>
                  {recommendedText.previewText && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {recommendedText.previewText}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    {recommendedText.createdByName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {recommendedText.createdByName}
                      </span>
                    )}
                    <span>
                      {t("reading.repository.images", {
                        count: recommendedText.imageCount,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <Button
                  className="w-full text-white font-semibold gap-2 bg-amber-500 hover:bg-amber-600"
                  onClick={handleStartReading}
                  disabled={loadingStart}
                >
                  {loadingStart ? (
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                  ) : (
                    t("recommendation.startReading")
                  )}
                  {!loadingStart && <ArrowRight className="w-4 h-4" />}
                </Button>
                {allTextsRef.current.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handlePickAnother}
                    disabled={loadingStart}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t("recommendation.pickAnother")}
                  </Button>
                )}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
