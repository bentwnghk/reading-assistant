"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Clock,
  Sparkles,
  Flame,
  Shuffle,
  Wand2,
  Layers,
  ClipboardList,
  SpellCheck,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/style";
import {
  useVocabularyStore,
  isStudyPlanDialogChecked,
  setStudyPlanDialogChecked,
} from "@/store/vocabulary";

type DialogStep = "presets" | "mode" | "getting-started";
type ReviewMode = "flashcard" | "quiz" | "spelling";

interface PendingPlan {
  strategy: VocabularySelectionStrategy;
  count: number;
}

interface StudyPlanDialogProps {
  onStartPlan: (
    strategy: VocabularySelectionStrategy,
    count: number,
    mode: ReviewMode
  ) => void;
}

const PRESET_CAPS: Record<string, number> = {
  due: 20,
  newest: 15,
  hardest: 15,
  random: 20,
};

export default function StudyPlanDialog({ onStartPlan }: StudyPlanDialogProps) {
  const { t } = useTranslation();
  const { status } = useSession();
  const { words, stats, isLoading } = useVocabularyStore();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("presets");
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customStrategy, setCustomStrategy] =
    useState<VocabularySelectionStrategy>("due");
  const [customCount, setCustomCount] = useState(10);
  const checkedRef = useRef(false);
  const seenLoadingRef = useRef(false);

  useEffect(() => {
    if (isStudyPlanDialogChecked()) {
      checkedRef.current = true;
      return;
    }
    if (checkedRef.current) return;
    if (status !== "authenticated") return;
    if (isLoading) {
      seenLoadingRef.current = true;
      return;
    }
    // Not loading: only proceed once a fetch cycle has been observed, or data
    // is already present (covers re-mounts after data loaded).
    if (!seenLoadingRef.current && words.length === 0 && stats.totalWords === 0) {
      return;
    }

    checkedRef.current = true;
    setStudyPlanDialogChecked(true);

    if (stats.totalWords === 0) {
      setStep("getting-started");
    } else {
      setStep("presets");
    }
    setOpen(true);
  }, [status, isLoading, words.length, stats.totalWords]);

  const handleDismiss = () => {
    setOpen(false);
  };

  const handleChoosePreset = (strategy: VocabularySelectionStrategy) => {
    const available = availableCount(strategy, stats);
    const cap = PRESET_CAPS[strategy] ?? 20;
    const count = Math.min(available, cap);
    if (count <= 0) return;
    setPendingPlan({ strategy, count });
    setStep("mode");
  };

  const handleCustomStart = () => {
    const maxCount = Math.min(words.length, 100);
    const count = Math.max(1, Math.min(customCount, maxCount));
    setPendingPlan({ strategy: customStrategy, count });
    setStep("mode");
  };

  const handleSelectMode = (mode: ReviewMode) => {
    if (!pendingPlan) return;
    setOpen(false);
    onStartPlan(pendingPlan.strategy, pendingPlan.count, mode);
  };

  const strategies: { key: VocabularySelectionStrategy; label: string }[] = [
    { key: "due", label: t("vocabulary.strategy.due") },
    { key: "hardest", label: t("vocabulary.strategy.hardest") },
    { key: "newest", label: t("vocabulary.strategy.newest") },
    { key: "random", label: t("vocabulary.strategy.random") },
    { key: "weakest", label: t("vocabulary.strategy.weakest") },
  ];

  const presets: {
    strategy: VocabularySelectionStrategy;
    icon: typeof Clock;
    color: string;
    border: string;
    text: string;
    labelKey: string;
    descKey: string;
  }[] = [
    {
      strategy: "due",
      icon: Clock,
      color: "bg-orange-500",
      border: "border-orange-500/40",
      text: "text-orange-500",
      labelKey: "vocabulary.studyPlan.presets.due",
      descKey: "vocabulary.studyPlan.presets.dueDesc",
    },
    {
      strategy: "newest",
      icon: Sparkles,
      color: "bg-blue-500",
      border: "border-blue-500/40",
      text: "text-blue-500",
      labelKey: "vocabulary.studyPlan.presets.new",
      descKey: "vocabulary.studyPlan.presets.newDesc",
    },
    {
      strategy: "hardest",
      icon: Flame,
      color: "bg-red-500",
      border: "border-red-500/40",
      text: "text-red-500",
      labelKey: "vocabulary.studyPlan.presets.hard",
      descKey: "vocabulary.studyPlan.presets.hardDesc",
    },
    {
      strategy: "random",
      icon: Shuffle,
      color: "bg-violet-500",
      border: "border-violet-500/40",
      text: "text-violet-500",
      labelKey: "vocabulary.studyPlan.presets.random",
      descKey: "vocabulary.studyPlan.presets.randomDesc",
    },
  ];

  const maxCustomCount = Math.min(words.length, 100);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleDismiss();
      }}
    >
      <DialogContent className="max-w-sm max-h-[85vh] text-center overflow-x-hidden overflow-y-auto scrollbar-hide">
        {step === "presets" && (
          <>
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />

            <div className="flex flex-col items-center gap-4 pt-4 pb-2">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full opacity-20 blur-xl animate-pulse bg-primary" />
                <div className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-primary shadow-primary/50">
                  <BookOpen className="w-8 h-8 text-white drop-shadow" />
                </div>
              </div>

              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-foreground">
                  {t("vocabulary.studyPlan.title")}
                </DialogTitle>
                <DialogDescription className="text-base font-medium text-foreground/80">
                  {t("vocabulary.studyPlan.subtitle")}
                </DialogDescription>
              </div>

              <div className="w-full space-y-2">
                {presets.map((preset) => {
                  const count = availableCount(preset.strategy, stats);
                  if (count <= 0) return null;
                  const capped = Math.min(count, PRESET_CAPS[preset.strategy] ?? 20);
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.strategy}
                      type="button"
                      className={cn(
                        "w-full p-4 rounded-xl border text-left transition-all",
                        "hover:scale-[1.02] active:scale-[0.98]",
                        preset.border,
                        "bg-background/60 backdrop-blur-sm"
                      )}
                      onClick={() => handleChoosePreset(preset.strategy)}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", preset.text)} />
                        <div className="flex-1 space-y-1">
                          <p className="font-semibold text-foreground">
                            {t(preset.labelKey, { count: capped })}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {t(preset.descKey)}
                          </p>
                        </div>
                        <ArrowRight className={cn("w-4 h-4 mt-1 shrink-0", preset.text)} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowCustom((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  {t("vocabulary.studyPlan.custom")}
                </span>
                {showCustom ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showCustom && (
                <div className="w-full space-y-3 rounded-xl border bg-muted/30 p-3 text-left">
                  <div>
                    <label className="text-sm font-medium">
                      {t("vocabulary.selectStrategy")}
                    </label>
                    <div className="mt-1 grid grid-cols-1 gap-1">
                      {strategies.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => setCustomStrategy(s.key)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors",
                            customStrategy === s.key
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      {t("vocabulary.wordCount")}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={maxCustomCount}
                      value={customCount}
                      onChange={(e) =>
                        setCustomCount(
                          Math.max(
                            1,
                            Math.min(
                              maxCustomCount,
                              parseInt(e.target.value) || 1
                            )
                          )
                        )
                      }
                      className="mt-1 h-8"
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <Button size="sm" className="w-full" onClick={handleCustomStart}>
                    {t("vocabulary.studyPlan.chooseMode")}
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={handleDismiss}
              >
                {t("vocabulary.studyPlan.maybeLater")}
              </Button>
            </div>
          </>
        )}

        {step === "mode" && pendingPlan && (
          <div className="flex flex-col items-center gap-4 pt-6 pb-2">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                {t("vocabulary.studyPlan.chooseModeTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("vocabulary.studyPlan.chooseModeDesc", {
                  count: pendingPlan.count,
                })}
              </DialogDescription>
            </div>

            <div className="w-full space-y-2">
              <ModeButton
                icon={Layers}
                color="bg-emerald-500"
                border="border-emerald-500/40"
                text="text-emerald-500"
                title={t("vocabulary.studyPlan.mode.flashcard")}
                desc={t("vocabulary.studyPlan.mode.flashcardDesc")}
                onClick={() => handleSelectMode("flashcard")}
              />
              <ModeButton
                icon={SpellCheck}
                color="bg-amber-500"
                border="border-amber-500/40"
                text="text-amber-500"
                title={t("vocabulary.studyPlan.mode.spelling")}
                desc={t("vocabulary.studyPlan.mode.spellingDesc")}
                onClick={() => handleSelectMode("spelling")}
              />
              <ModeButton
                icon={ClipboardList}
                color="bg-sky-500"
                border="border-sky-500/40"
                text="text-sky-500"
                title={t("vocabulary.studyPlan.mode.quiz")}
                desc={t("vocabulary.studyPlan.mode.quizDesc")}
                onClick={() => handleSelectMode("quiz")}
              />
            </div>

            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setStep("presets")}
            >
              <ArrowLeft className="w-4 h-4" />
              {t("vocabulary.studyPlan.back")}
            </button>
          </div>
        )}

        {step === "getting-started" && (
          <div className="flex flex-col items-center gap-4 pt-6 pb-2">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-20 h-20 rounded-full opacity-20 blur-xl animate-pulse bg-primary" />
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-primary shadow-primary/50">
                <BookOpen className="w-8 h-8 text-white drop-shadow" />
              </div>
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                {t("vocabulary.studyPlan.gettingStarted")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("vocabulary.studyPlan.gettingStartedDesc")}
              </DialogDescription>
            </div>
            <Button asChild className="w-full">
              <Link href="/">
                {t("vocabulary.studyPlan.gettingStartedCta")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleDismiss}
            >
              {t("vocabulary.studyPlan.maybeLater")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  icon: Icon,
  color,
  border,
  text,
  title,
  desc,
  onClick,
}: {
  icon: typeof Layers;
  color: string;
  border: string;
  text: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all",
        "hover:scale-[1.02] active:scale-[0.98]",
        border,
        "bg-background/60 backdrop-blur-sm"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            color
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">{desc}</p>
        </div>
        <ArrowRight className={cn("w-4 h-4 mt-1 shrink-0", text)} />
      </div>
    </button>
  );
}

function availableCount(
  strategy: VocabularySelectionStrategy,
  stats: VocabularyStats
): number {
  switch (strategy) {
    case "due":
      return stats.dueForReview;
    case "hardest":
      return stats.hard;
    case "newest":
      return stats.newWords;
    case "random":
      return stats.totalWords;
    case "weakest":
      return stats.totalWords - stats.newWords;
    default:
      return 0;
  }
}
