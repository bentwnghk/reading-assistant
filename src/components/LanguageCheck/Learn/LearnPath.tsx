"use client";
import { useTranslation } from "react-i18next";
import { BookOpen, Check, Lock, PenLine, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/style";
import { categoryStyle, useCategoryLabel } from "@/components/LanguageCheck/shared";
import {
  practiceDone,
  practicePercent,
  quizDone,
  quizPercent,
  stageUnlocked,
  type LearnLocation,
  type LearnSession,
  type LearnStage,
} from "@/store/languageCheckLearn";

const STAGES: { stage: LearnStage; icon: LucideIcon }[] = [
  { stage: "lesson", icon: BookOpen },
  { stage: "practice", icon: PenLine },
  { stage: "quiz", icon: Trophy },
];

interface LearnPathProps {
  session: LearnSession;
  onGo: (location: LearnLocation) => void;
}

/** Sidebar / top strip: every unit with its three stages and progress. */
export default function LearnPath({ session, onGo }: LearnPathProps) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const current = session.current;
  const allDone = session.units.every(quizDone);

  return (
    <nav aria-label={t("languageCheck.learn.path.title")} className="space-y-3">
      <ol className="space-y-3">
        {session.units.map((unit, ui) => {
          const style = categoryStyle(unit.category);
          const here = current === "summary" ? null : current;
          const unitActive = here?.unit === ui;
          return (
            <li
              key={unit.category}
              className={cn(
                "rounded-xl border bg-card p-3 transition-shadow",
                unitActive && "shadow-md ring-1 ring-primary/40",
              )}
            >
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", style.dot)} />
                <span className="min-w-0 flex-1 truncate">{categoryLabel(unit.category)}</span>
                {quizDone(unit) && <Check className="h-4 w-4 shrink-0 text-green-600" />}
              </p>
              <ul className="space-y-1">
                {STAGES.map(({ stage, icon: Icon }) => {
                  const unlocked = stageUnlocked(unit, stage);
                  const active = unitActive && here?.stage === stage;
                  const complete =
                    stage === "lesson"
                      ? unit.lessonSeen
                      : stage === "practice"
                        ? practiceDone(unit)
                        : quizDone(unit);
                  const pct =
                    stage === "practice"
                      ? practicePercent(unit)
                      : stage === "quiz"
                        ? quizPercent(unit)
                        : null;
                  const loading = unit[stage].status === "loading";
                  return (
                    <li key={stage}>
                      <button
                        type="button"
                        disabled={!unlocked}
                        aria-current={active ? "step" : undefined}
                        onClick={() => onGo({ unit: ui, stage })}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active ? "bg-primary text-primary-foreground" : unlocked ? "hover:bg-accent" : "cursor-not-allowed text-muted-foreground/60",
                        )}
                      >
                        {unlocked ? (
                          <Icon className="h-4 w-4 shrink-0" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="flex-1">{t(`languageCheck.learn.path.${stage}`)}</span>
                        {loading && (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        )}
                        {pct !== null && (
                          <span className="text-xs font-semibold tabular-nums">{pct}%</span>
                        )}
                        {complete && pct === null && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        disabled={!allDone}
        onClick={() => onGo("summary")}
        aria-current={current === "summary" ? "step" : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          current === "summary" ? "bg-primary text-primary-foreground" : allDone ? "bg-card hover:bg-accent" : "cursor-not-allowed text-muted-foreground/60",
        )}
      >
        {allDone ? <Trophy className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        {t("languageCheck.learn.path.summary")}
      </button>
    </nav>
  );
}
