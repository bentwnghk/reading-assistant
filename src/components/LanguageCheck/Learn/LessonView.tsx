"use client";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpenCheck,
  Languages,
  Lightbulb,
  Target,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";
import { DiffChips, categoryStyle } from "@/components/LanguageCheck/shared";
import {
  markSentence,
  pickLang,
  type LearnErrorSample,
  type LearnLesson,
} from "@/utils/languageCheckLearn";
import type { LearnUnit } from "@/store/languageCheckLearn";
import type { ExplanationLanguage } from "@/store/languageCheck";

interface LessonViewProps {
  unit: LearnUnit;
  lesson: LearnLesson;
  language: ExplanationLanguage;
  categoryLabel: string;
  onContinue: () => void;
  /** Read-only review (staff / history): no "Start practice" button. */
  readOnly?: boolean;
}

function SectionTitle({
  icon: Icon,
  children,
  tone = "text-primary",
}: {
  icon: typeof Lightbulb;
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
      <Icon className={cn("h-4 w-4", tone)} />
      {children}
    </h3>
  );
}

/** The learner's sentence with the wrong words underlined and a red ^ where something is missing. */
function MarkedSentence({ sample }: { sample: LearnErrorSample }) {
  const { t } = useTranslation();
  const pieces = markSentence(sample);
  return (
    <>
      “
      {pieces.map((piece, i) => {
        if (piece.kind === "wrong") {
          return (
            <span
              key={i}
              className="font-medium text-foreground underline decoration-red-500 decoration-2 underline-offset-4"
            >
              {piece.text}
            </span>
          );
        }
        if (piece.kind === "missing") {
          return (
            <span
              key={i}
              role="img"
              aria-label={t("languageCheck.learn.lesson.missingHere")}
              title={t("languageCheck.learn.lesson.missingHere")}
              className="mx-px select-none text-base font-extrabold leading-none text-red-600 dark:text-red-400"
            >
              ^
            </span>
          );
        }
        return <span key={i}>{piece.text}</span>;
      })}
      ”
    </>
  );
}

/**
 * Notice → understand → remember. Starts from the learner's own mistakes (so
 * the rule answers a problem they have just seen), then the rule, contrasts
 * of wrong/right, the Chinese-transfer cause and self-check tips.
 */
export default function LessonView({
  unit,
  lesson,
  language,
  categoryLabel,
  onContinue,
  readOnly = false,
}: LessonViewProps) {
  const { t } = useTranslation();
  const style = categoryStyle(unit.category);
  const title = pickLang(lesson.title, lesson.titleZh, language) || categoryLabel;
  const why = pickLang(lesson.whyItMatters, lesson.whyItMattersZh, language);

  return (
    <div className="space-y-6">
      <header className={cn("space-y-3 rounded-2xl border border-l-8 bg-card p-5 sm:p-7", style.border)}>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("languageCheck.learn.lesson.label")} · {categoryLabel}
        </p>
        <h2 className="text-2xl font-bold leading-tight">{title}</h2>
        <p className="flex items-start gap-2 text-lg leading-relaxed">
          <Target className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <span>{pickLang(lesson.summary, lesson.summaryZh, language)}</span>
        </p>
        {why && <p className="text-sm text-muted-foreground">{why}</p>}
      </header>

      {unit.samples.length > 0 && (
        <section className="space-y-3">
          <SectionTitle icon={TriangleAlert} tone="text-rose-500">
            {t("languageCheck.learn.lesson.yourMistakes", { count: unit.mistakeCount })}
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {unit.samples.slice(0, 4).map((sample, i) => (
              <div key={i} className="space-y-2 rounded-xl border bg-card p-4">
                <p className="text-sm leading-relaxed text-muted-foreground" lang="en">
                  <MarkedSentence sample={sample} />
                </p>
                <DiffChips original={sample.original} correction={sample.correction} />
                {sample.explanation && <p className="text-sm">{sample.explanation}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <SectionTitle icon={BookOpenCheck}>{t("languageCheck.learn.lesson.theRule")}</SectionTitle>
        <div className="space-y-3">
          {lesson.rules.map((rule, i) => {
            const heading = pickLang(rule.heading, rule.headingZh, language);
            return (
              <div key={i} className="space-y-3 rounded-xl border bg-card p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 space-y-2">
                    {heading && <h4 className="text-base font-semibold">{heading}</h4>}
                    <p className="leading-relaxed">
                      {pickLang(rule.explanation, rule.explanationZh, language)}
                    </p>
                  </div>
                </div>
                {rule.pattern && (
                  <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm" lang="en">
                    {rule.pattern}
                  </p>
                )}
                {rule.examples.length > 0 && (
                  <ul className="space-y-1.5">
                    {rule.examples.map((example, j) => (
                      <li
                        key={j}
                        lang="en"
                        className="rounded-md border-l-4 border-green-500 bg-green-50 px-3 py-1.5 text-base dark:bg-green-950/30"
                      >
                        {example}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {lesson.contrasts.length > 0 && (
        <section className="space-y-3">
          <SectionTitle icon={TriangleAlert} tone="text-amber-500">
            {t("languageCheck.learn.lesson.commonMistakes")}
          </SectionTitle>
          <div className="space-y-2">
            {lesson.contrasts.map((pair, i) => (
              <div key={i} className="overflow-hidden rounded-xl border text-base" lang="en">
                <p className="flex items-start gap-2 bg-red-50 px-4 py-2 dark:bg-red-950/40">
                  <span className="mt-1 text-[11px] font-bold uppercase text-red-600 dark:text-red-400">
                    {t("languageCheck.learn.lesson.wrong")}
                  </span>
                  <span className="text-muted-foreground line-through">{pair.wrong}</span>
                </p>
                <p className="flex items-start gap-2 bg-green-50 px-4 py-2 dark:bg-green-950/40">
                  <span className="mt-1 text-[11px] font-bold uppercase text-green-600 dark:text-green-400">
                    {t("languageCheck.learn.lesson.right")}
                  </span>
                  <span className="font-medium">{pair.right}</span>
                </p>
                {(pair.why || pair.whyZh) && (
                  <p className="border-t bg-card px-4 py-2 text-sm text-muted-foreground" lang={language === "zh" ? "zh-HK" : "en"}>
                    {pickLang(pair.why, pair.whyZh, language)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {lesson.chineseTransfer && (
        <section className="space-y-3">
          <SectionTitle icon={Languages} tone="text-sky-500">
            {t("languageCheck.learn.lesson.chineseTransfer")}
          </SectionTitle>
          <p className="rounded-xl border border-sky-300/60 bg-sky-50 p-4 leading-relaxed dark:border-sky-800 dark:bg-sky-950/30">
            {pickLang(
              lesson.chineseTransfer.explanation,
              lesson.chineseTransfer.explanationZh,
              language,
            )}
          </p>
        </section>
      )}

      {lesson.tips.length > 0 && (
        <section className="space-y-3">
          <SectionTitle icon={Lightbulb} tone="text-amber-500">
            {t("languageCheck.learn.lesson.tips")}
          </SectionTitle>
          <ul className="space-y-2">
            {lesson.tips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-xl border bg-amber-50 px-4 py-3 dark:bg-amber-950/30"
              >
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{pickLang(tip.tip, tip.tipZh, language)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!readOnly && (
        <div className="flex justify-end pt-2">
          <Button size="lg" onClick={onContinue}>
            {t("languageCheck.learn.lesson.startPractice")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
