"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, CircleCheck, CircleX, LoaderCircle, RotateCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/utils/style";
import ExerciseCard from "@/components/LanguageCheck/Learn/ExerciseCard";
import StageStatus from "@/components/LanguageCheck/Learn/StageStatus";
import useLanguageCheckLearn from "@/hooks/useLanguageCheckLearn";
import {
  quizDone,
  quizPercent,
  useLanguageCheckLearnStore,
  type LearnUnit,
} from "@/store/languageCheckLearn";
import { isStrictCategory, pickLang } from "@/utils/languageCheckLearn";
import {
  answerText,
  exercisePrompt,
  exerciseSolution,
  masteryFor,
} from "@/utils/languageCheckLearnGrade";
import type { ExplanationLanguage } from "@/store/languageCheck";

interface QuizPlayerProps {
  sessionKey: string;
  unit: LearnUnit;
  language: ExplanationLanguage;
  nextLabel: string;
  onNext: () => void;
}

export default function QuizPlayer({
  sessionKey,
  unit,
  language,
  nextLabel,
  onNext,
}: QuizPlayerProps) {
  const { t } = useTranslation();
  const { ensureQuiz } = useLanguageCheckLearn();
  const recordQuiz = useLanguageCheckLearnStore((s) => s.recordQuiz);
  const items = unit.quiz.data;
  const [started, setStarted] = useState(false);

  if (!items || unit.quiz.status === "error" || unit.quiz.status === "loading") {
    return (
      <StageStatus
        stage={unit.quiz}
        loadingKey="languageCheck.learn.loading.quiz"
        onRetry={() => void ensureQuiz(sessionKey, unit.category)}
      />
    );
  }

  const strict = isStrictCategory(unit.category);
  const answered = items.filter((i) => unit.quizResults[i.id]).length;

  if (quizDone(unit)) {
    return (
      <QuizReview
        unit={unit}
        language={language}
        nextLabel={nextLabel}
        onNext={onNext}
        onRetake={() => {
          setStarted(true);
          void ensureQuiz(sessionKey, unit.category, { retake: true });
        }}
      />
    );
  }

  if (!started && answered === 0) {
    return (
      <div className="space-y-5 rounded-2xl border bg-card p-6 text-center sm:p-10">
        <Trophy className="mx-auto h-10 w-10 text-primary" />
        <h2 className="text-2xl font-bold">{t("languageCheck.learn.quiz.introTitle")}</h2>
        <p className="mx-auto max-w-md text-muted-foreground">
          {t("languageCheck.learn.quiz.introBody", { count: items.length })}
        </p>
        <Button size="lg" onClick={() => setStarted(true)}>
          {t("languageCheck.learn.quiz.begin")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  const index = Math.min(answered, items.length - 1);
  const item = items[index];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={(answered / items.length) * 100} className="h-2 flex-1" />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {answered}/{items.length}
        </span>
      </div>
      <ExerciseCard
        key={item.id}
        item={item}
        index={index}
        total={items.length}
        mode="quiz"
        language={language}
        strict={strict}
        isLast={index === items.length - 1}
        onSubmit={(answer, outcome) =>
          recordQuiz(sessionKey, unit.category, item.id, { answer, ...outcome })
        }
        onNext={() => {}}
      />
    </div>
  );
}

function QuizReview({
  unit,
  language,
  nextLabel,
  onNext,
  onRetake,
}: {
  unit: LearnUnit;
  language: ExplanationLanguage;
  nextLabel: string;
  onNext: () => void;
  onRetake: () => void;
}) {
  const { t } = useTranslation();
  const items = unit.quiz.data ?? [];
  const pct = quizPercent(unit) ?? 0;
  const mastery = masteryFor(pct);
  const right = items.filter((i) => unit.quizResults[i.id]?.correct).length;
  const retaking = unit.quiz.status === "loading";

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border bg-card p-6 text-center sm:p-10">
        <Trophy
          className={cn(
            "mx-auto h-10 w-10",
            mastery === "secure" ? "text-amber-500" : "text-primary",
          )}
        />
        <h2 className="text-2xl font-bold">{t("languageCheck.learn.quiz.resultTitle")}</h2>
        <p className="text-5xl font-extrabold tabular-nums">{pct}%</p>
        <p className="text-sm text-muted-foreground">
          {t("languageCheck.learn.quiz.score", { right, total: items.length })}
        </p>
        <p className="mx-auto max-w-md font-medium">
          {t(`languageCheck.learn.quiz.mastery.${mastery}`)}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button variant="outline" onClick={onRetake} disabled={retaking}>
            {retaking ? (
              <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="mr-1.5 h-4 w-4" />
            )}
            {t("languageCheck.learn.quiz.retake")}
          </Button>
          <Button onClick={onNext}>
            {nextLabel}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {t("languageCheck.learn.quiz.reviewTitle")}
        </h3>
        {items.map((item, i) => {
          const result = unit.quizResults[item.id];
          const ok = result?.correct ?? false;
          const mine = result ? answerText(item, result.answer) : "";
          const explanation = pickLang(item.explanation, item.explanationZh, language);
          return (
            <div
              key={item.id}
              className={cn(
                "space-y-2 rounded-xl border border-l-4 bg-card p-4",
                ok ? "border-l-green-500" : "border-l-red-500",
              )}
            >
              <p className="flex items-start gap-2 text-sm font-semibold">
                {ok ? (
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <span lang="en" className="break-words">
                  {i + 1}. {exercisePrompt(item).replace(/_{2,}/g, "____")}
                </span>
              </p>
              {!ok && (
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {t("languageCheck.learn.quiz.yourAnswer")}:{" "}
                  </span>
                  <span lang="en" className="text-red-700 dark:text-red-300">
                    {mine || "—"}
                  </span>
                </p>
              )}
              <p className="text-sm">
                <span className="text-muted-foreground">
                  {t("languageCheck.learn.exercise.modelAnswer")}:{" "}
                </span>
                <span lang="en" className="font-medium text-green-700 dark:text-green-300">
                  {exerciseSolution(item)}
                </span>
              </p>
              {explanation && <p className="text-sm text-muted-foreground">{explanation}</p>}
            </div>
          );
        })}
      </section>
    </div>
  );
}
