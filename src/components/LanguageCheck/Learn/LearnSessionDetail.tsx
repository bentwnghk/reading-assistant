"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleCheck, CircleX, Lock } from "lucide-react";
import { cn } from "@/utils/style";
import { formatDateTime } from "@/utils/formatDate";
import { Switch } from "@/components/ui/switch";
import { categoryStyle, useCategoryLabel } from "@/components/LanguageCheck/shared";
import { PercentBadge } from "@/components/LanguageCheck/Learn/LearnDashboardView";
import LessonView from "@/components/LanguageCheck/Learn/LessonView";
import { unitFromWire } from "@/store/languageCheckLearn";
import type { ExplanationLanguage } from "@/store/languageCheck";
import { pickLang, type LearnExercise } from "@/utils/languageCheckLearn";
import {
  answerText,
  exercisePrompt,
  exerciseSolution,
} from "@/utils/languageCheckLearnGrade";
import { practiceProgress, quizProgress } from "@/utils/languageCheckLearnProgress";
import type {
  LearnRoundWire,
  LearnSessionWire,
  LearnUnitWire,
} from "@/utils/languageCheckLearnWire";

type Tab = "lesson" | "practice" | "quiz";

interface Props {
  session: LearnSessionWire;
  rounds: LearnRoundWire[];
}

/**
 * Read-only view of a saved learning session: the material that was generated,
 * how the learner did in practice and every quiz round with their answers.
 * Used by the student's "My learning" list and by the staff dashboard.
 */
export default function LearnSessionDetail({ session, rounds }: Props) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const [language, setLanguage] = useState<ExplanationLanguage>("en");
  const [unitIndex, setUnitIndex] = useState(0);
  const [tab, setTab] = useState<Tab>("quiz");
  const unit = session.units[unitIndex];

  if (!unit) return null;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {formatDateTime(session.createdAt)} · {t("languageCheck.learnData.updated")}{" "}
          {formatDateTime(session.updatedAt)}
        </p>
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
          <span className={language === "en" ? "font-semibold" : "text-muted-foreground"}>English</span>
          <Switch
            checked={language === "zh"}
            onCheckedChange={(c) => setLanguage(c ? "zh" : "en")}
            aria-label={t("languageCheck.results.explanationLanguage")}
          />
          <span className={language === "zh" ? "font-semibold" : "text-muted-foreground"}>繁體中文</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist">
        {session.units.map((u, i) => {
          const quiz = quizProgress(u.quiz, u.quizResults);
          return (
            <button
              key={u.category}
              type="button"
              role="tab"
              aria-selected={i === unitIndex}
              onClick={() => setUnitIndex(i)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors",
                i === unitIndex ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent",
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", categoryStyle(u.category).dot)} />
              {categoryLabel(u.category)}
              <PercentBadge value={quiz.percent} />
            </button>
          );
        })}
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist">
        {(["lesson", "practice", "quiz"] as const).map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={tab === x}
            onClick={() => setTab(x)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
              tab === x ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`languageCheck.learn.path.${x}`)}
          </button>
        ))}
      </div>

      <div className="min-h-0 overflow-y-auto pr-1">
        {tab === "lesson" && <LessonTab unit={unit} language={language} label={categoryLabel(unit.category)} />}
        {tab === "practice" && <PracticeTab unit={unit} language={language} />}
        {tab === "quiz" && (
          <QuizTab
            unit={unit}
            language={language}
            rounds={rounds.filter((r) => r.category === unit.category)}
          />
        )}
      </div>
    </div>
  );
}

function Missing({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function LessonTab({ unit, language, label }: { unit: LearnUnitWire; language: ExplanationLanguage; label: string }) {
  const { t } = useTranslation();
  if (!unit.lesson) return <Missing>{t("languageCheck.learnData.detail.noLesson")}</Missing>;
  const local = unitFromWire(unit);
  return (
    <LessonView
      unit={local}
      lesson={unit.lesson}
      language={language}
      categoryLabel={label}
      onContinue={() => undefined}
      readOnly
    />
  );
}

interface ReviewItem {
  id: string;
  item: LearnExercise;
  /** null = not attempted. */
  ok: boolean | null;
  mine: string;
  note?: string;
}

function Review({ items, language }: { items: ReviewItem[]; language: ExplanationLanguage }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      {items.map(({ id, item, ok, mine, note }, i) => {
        const explanation = pickLang(item.explanation, item.explanationZh, language);
        return (
          <div
            key={id}
            className={cn(
              "space-y-1.5 rounded-xl border border-l-4 bg-card p-3",
              ok === null ? "border-l-muted-foreground/40" : ok ? "border-l-green-500" : "border-l-red-500",
            )}
          >
            <p className="flex items-start gap-2 text-sm font-semibold">
              {ok === null ? null : ok ? (
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}
              <span lang="en" className="break-words">
                {i + 1}. {exercisePrompt(item).replace(/_{2,}/g, "____")}
              </span>
            </p>
            {mine && (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("languageCheck.learn.quiz.yourAnswer")}: </span>
                <span lang="en" className={ok === false ? "text-red-700 dark:text-red-300" : ""}>{mine}</span>
              </p>
            )}
            <p className="text-sm">
              <span className="text-muted-foreground">{t("languageCheck.learn.exercise.modelAnswer")}: </span>
              <span lang="en" className="font-medium text-green-700 dark:text-green-300">
                {exerciseSolution(item)}
              </span>
            </p>
            {explanation && <p className="text-sm text-muted-foreground">{explanation}</p>}
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
          </div>
        );
      })}
    </div>
  );
}

function Locked({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      <Lock className="h-5 w-5" />
      {children}
    </div>
  );
}

function PracticeTab({ unit, language }: { unit: LearnUnitWire; language: ExplanationLanguage }) {
  const { t } = useTranslation();
  if (unit.hidden?.practice) {
    return (
      <Locked>
        <p className="font-medium text-foreground">{t("languageCheck.learnData.detail.practiceLocked")}</p>
        <p>
          {t("languageCheck.learnData.detail.practiceLockedHint", {
            completed: unit.hidden.practice.completed,
            total: unit.hidden.practice.total,
          })}
        </p>
      </Locked>
    );
  }
  if (!unit.practice) return <Missing>{t("languageCheck.learnData.detail.noPractice")}</Missing>;
  const p = practiceProgress(unit.practice, unit.practiceResults);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {p.percentSoFar === null
          ? t("languageCheck.learnData.detail.practiceSummaryNone", {
              completed: p.completed,
              total: p.total,
            })
          : t("languageCheck.learnData.detail.practiceSummary", {
              completed: p.completed,
              total: p.total,
              percent: p.percentSoFar,
            })}
      </p>
      <Review
        language={language}
        items={unit.practice.map((item) => {
          const r = unit.practiceResults[item.id];
          return {
            id: item.id,
            item,
            ok: r ? r.score >= 1 : null,
            mine: r?.answer !== undefined ? answerText(item, r.answer) : "",
            note: r
              ? `${t("languageCheck.learnData.detail.attempts", { count: r.attempts })}${
                  r.revealed ? ` · ${t("languageCheck.learnData.detail.revealed")}` : ""
                }${
                  r.lastAnswer !== undefined &&
                  r.answer !== undefined &&
                  answerText(item, r.lastAnswer) !== answerText(item, r.answer)
                    ? ` · ${t("languageCheck.learnExport.finalAnswer")}: ${answerText(item, r.lastAnswer)}`
                    : ""
                }`
              : t("languageCheck.learnData.detail.notAttempted"),
          };
        })}
      />
    </div>
  );
}

function QuizTab({
  unit,
  language,
  rounds,
}: {
  unit: LearnUnitWire;
  language: ExplanationLanguage;
  rounds: LearnRoundWire[];
}) {
  const { t } = useTranslation();
  // Finished rounds are archived; the round in progress is shown as the last one.
  const live =
    unit.quiz && !rounds.some((r) => r.round === unit.quizRound)
      ? {
          round: unit.quizRound,
          percent: quizProgress(unit.quiz, unit.quizResults).percent,
          items: unit.quiz,
          results: unit.quizResults,
          completedAt: 0,
        }
      : null;
  const all = [
    ...rounds.map((r) => ({
      round: r.round,
      percent: r.percent as number | null,
      items: r.items,
      results: r.results,
      completedAt: r.completedAt,
    })),
    ...(live ? [live] : []),
  ];
  const [selected, setSelected] = useState<number | null>(null);
  const lockedRound = unit.hidden?.quiz;
  if (all.length === 0) {
    return lockedRound ? (
      <Locked>
        <p className="font-medium text-foreground">{t("languageCheck.learnData.detail.quizLocked")}</p>
        <p>
          {t("languageCheck.learnData.detail.quizLockedHint", {
            answered: lockedRound.answered,
            total: lockedRound.total,
          })}
        </p>
      </Locked>
    ) : (
      <Missing>{t("languageCheck.learnData.detail.noQuiz")}</Missing>
    );
  }
  const round = all.find((r) => r.round === selected) ?? all[all.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {all.map((r) => (
          <button
            key={r.round}
            type="button"
            onClick={() => setSelected(r.round)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
              r.round === round.round ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent",
            )}
          >
            {t("languageCheck.learnData.round", { round: r.round })}
            <PercentBadge value={r.percent} />
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {round.completedAt
          ? formatDateTime(round.completedAt)
          : t("languageCheck.learnData.detail.inProgress")}
      </p>
      {lockedRound && (
        <Locked>
          <p className="font-medium text-foreground">{t("languageCheck.learnData.detail.quizLocked")}</p>
          <p>
            {t("languageCheck.learnData.detail.quizLockedHint", {
              answered: lockedRound.answered,
              total: lockedRound.total,
            })}
          </p>
        </Locked>
      )}
      <Review
        language={language}
        items={round.items.map((item) => {
          const r = round.results[item.id];
          return {
            id: item.id,
            item,
            ok: r ? r.correct : null,
            mine: r ? answerText(item, r.answer) : "",
            note: r ? undefined : t("languageCheck.learnData.detail.notAttempted"),
          };
        })}
      />
    </div>
  );
}
