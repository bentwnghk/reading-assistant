"use client";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Award, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";
import { categoryStyle, useCategoryLabel } from "@/components/LanguageCheck/shared";
import { SummaryCelebration } from "@/components/LanguageCheck/Learn/ResultCelebration";
import { practicePercent, quizPercent, type LearnSession } from "@/store/languageCheckLearn";
import { masteryFor, type Mastery } from "@/utils/languageCheckLearnGrade";

const TONE: Record<Mastery, string> = {
  secure: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  developing: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  review: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

interface LearnSummaryProps {
  session: LearnSession;
  onReview: (unit: number) => void;
  onBackToEssay: () => void;
}

/** End of the session: per-category mastery with the next step for each. */
export default function LearnSummary({ session, onReview, onBackToEssay }: LearnSummaryProps) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const rows = session.units.map((unit, i) => {
    const quiz = quizPercent(unit) ?? 0;
    return { unit, i, quiz, practice: practicePercent(unit), mastery: masteryFor(quiz) };
  });
  const average = rows.length
    ? Math.round(rows.reduce((a, r) => a + r.quiz, 0) / rows.length)
    : 0;
  const weakest = rows.filter((r) => r.mastery !== "secure");

  return (
    <div className="space-y-6">
      <SummaryCelebration sessionKey={session.key} mastery={masteryFor(average)} />
      <div className="animate-pop-in space-y-2 rounded-2xl border bg-card p-6 text-center sm:p-10">
        <Award className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="text-2xl font-bold">{t("languageCheck.learn.summary.title")}</h2>
        <p className="text-5xl font-extrabold tabular-nums">{average}%</p>
        <p className="text-sm text-muted-foreground">
          {t("languageCheck.learn.summary.average", { count: rows.length })}
        </p>
        <p className="mx-auto max-w-lg pt-2 font-medium">
          {weakest.length === 0
            ? t("languageCheck.learn.summary.allSecure")
            : t("languageCheck.learn.summary.keepGoing", {
                topics: weakest.map((r) => categoryLabel(r.unit.category)).join(", "),
              })}
        </p>
      </div>

      <ul className="space-y-3">
        {rows.map(({ unit, i, quiz, practice, mastery }) => (
          <li
            key={unit.category}
            className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-l-4 bg-card p-4", categoryStyle(unit.category).border)}
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{categoryLabel(unit.category)}</p>
              <p className="text-xs text-muted-foreground">
                {t("languageCheck.learn.summary.detail", {
                  practice: practice ?? 0,
                  quiz,
                  count: unit.mistakeCount,
                })}
              </p>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", TONE[mastery])}>
              {t(`languageCheck.learn.summary.levels.${mastery}`)}
            </span>
            {mastery !== "secure" && (
              <Button variant="outline" size="sm" onClick={() => onReview(i)}>
                <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                {t("languageCheck.learn.summary.reviewTopic")}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        {t("languageCheck.learn.summary.nextStep")}
      </p>

      <div className="flex justify-center">
        <Button size="lg" onClick={onBackToEssay}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("languageCheck.learn.summary.backToEssay")}
        </Button>
      </div>
    </div>
  );
}
