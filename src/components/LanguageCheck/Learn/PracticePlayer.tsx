"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, LoaderCircle, PartyPopper, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ExerciseCard from "@/components/LanguageCheck/Learn/ExerciseCard";
import StageStatus from "@/components/LanguageCheck/Learn/StageStatus";
import useLanguageCheckLearn from "@/hooks/useLanguageCheckLearn";
import {
  practicePercent,
  useLanguageCheckLearnStore,
  type LearnUnit,
} from "@/store/languageCheckLearn";
import { isStrictCategory, type LearnExercise } from "@/utils/languageCheckLearn";
import { masteryFor } from "@/utils/languageCheckLearnGrade";
import type { ExplanationLanguage } from "@/store/languageCheck";

interface PracticePlayerProps {
  sessionKey: string;
  unit: LearnUnit;
  language: ExplanationLanguage;
  onContinue: () => void;
}

/** Index of the first item not yet completed (items.length when all are). */
function firstOpen(unit: LearnUnit, items: LearnExercise[]): number {
  const at = items.findIndex((i) => !unit.practiceResults[i.id]?.completed);
  return at === -1 ? items.length : at;
}

export default function PracticePlayer({
  sessionKey,
  unit,
  language,
  onContinue,
}: PracticePlayerProps) {
  const { t } = useTranslation();
  const { ensurePractice, evaluateOpen } = useLanguageCheckLearn();
  const recordPractice = useLanguageCheckLearnStore((s) => s.recordPractice);
  const items = unit.practice.data;
  const [index, setIndex] = useState(() => (items ? firstOpen(unit, items) : 0));

  if (!items || unit.practice.status === "error" || (unit.practice.status === "loading" && !items)) {
    return (
      <StageStatus
        stage={unit.practice}
        loadingKey="languageCheck.learn.loading.practice"
        onRetry={() => void ensurePractice(sessionKey, unit.category)}
      />
    );
  }

  const strict = isStrictCategory(unit.category);
  const done = items.filter((i) => unit.practiceResults[i.id]?.completed).length;
  const finished = index >= items.length;
  const loadingMore = unit.practice.status === "loading";

  if (finished) {
    const pct = practicePercent(unit) ?? 0;
    const mastery = masteryFor(pct);
    return (
      <div className="space-y-5 rounded-2xl border bg-card p-6 text-center sm:p-10">
        <PartyPopper className="mx-auto h-10 w-10 text-primary" />
        <h2 className="text-2xl font-bold">{t("languageCheck.learn.practice.doneTitle")}</h2>
        <p className="text-4xl font-extrabold tabular-nums">{pct}%</p>
        <p className="mx-auto max-w-md text-muted-foreground">
          {t(`languageCheck.learn.practice.mastery.${mastery}`)}
        </p>
        {unit.practice.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{unit.practice.error}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={async () => {
              const start = items.length;
              await ensurePractice(sessionKey, unit.category, { more: true });
              setIndex(start);
            }}
          >
            {loadingMore ? (
              <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            {t("languageCheck.learn.practice.moreExercises")}
          </Button>
          <Button onClick={onContinue}>
            {t("languageCheck.learn.practice.toQuiz")}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIndex(0)}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          {t("languageCheck.learn.practice.reviewAnswers")}
        </Button>
      </div>
    );
  }

  const item = items[index];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={(done / items.length) * 100} className="h-2 flex-1" />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {done}/{items.length}
        </span>
      </div>
      <ExerciseCard
        key={item.id}
        item={item}
        index={index}
        total={items.length}
        mode="practice"
        language={language}
        strict={strict}
        solved={!!unit.practiceResults[item.id]?.completed}
        isLast={index === items.length - 1}
        onAttempt={({ score, correct }) =>
          recordPractice(sessionKey, unit.category, item.id, (prev) => ({
            // Only the first attempt is scored; retries are for learning.
            score: prev ? prev.score : score,
            attempts: (prev?.attempts ?? 0) + 1,
            completed: !!prev?.completed || correct,
          }))
        }
        onReveal={() =>
          recordPractice(sessionKey, unit.category, item.id, (prev) => ({
            score: prev?.score ?? 0,
            attempts: prev?.attempts ?? 1,
            completed: true,
          }))
        }
        onNext={() => setIndex(index + 1)}
        evaluateOpen={(it, answer) => evaluateOpen(sessionKey, unit.category, it, answer)}
      />
      {index > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setIndex(index - 1)}>
          {t("languageCheck.learn.exercise.previous")}
        </Button>
      )}
    </div>
  );
}
