"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Award, CheckCircle2, LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";
import useLanguageCheck from "@/hooks/useLanguageCheck";
import { LANGUAGE_ASSESSMENT_DIMENSIONS } from "@/constants/readingPrompts";
import type { ExplanationLanguage } from "@/store/languageCheck";

interface AssessmentPanelProps {
  essay: Pick<
    LanguageCheckEssay,
    "id" | "checkedText" | "transcript" | "corrections" | "assessment"
  >;
  language: ExplanationLanguage;
  /** Persists a fresh assessment; throwing shows a toast (result is still shown). */
  onSave: (assessment: LanguageCheckAssessment) => Promise<void>;
}

function tone(score: number): string {
  if (score >= 6) return "bg-emerald-500";
  if (score >= 4) return "bg-sky-500";
  if (score >= 3) return "bg-amber-500";
  return "bg-rose-500";
}

export default function AssessmentPanel({ essay, language, onSave }: AssessmentPanelProps) {
  const { t } = useTranslation();
  const { assessLanguage } = useLanguageCheck();
  const [fresh, setFresh] = useState<{
    id: string;
    value: LanguageCheckAssessment;
  } | null>(null);
  const result =
    fresh && fresh.id === essay.id ? fresh.value : essay.assessment;
  const [loading, setLoading] = useState(false);

  async function run() {
    if (loading) return;
    setLoading(true);
    const id = essay.id;
    try {
      const r = await assessLanguage(essay);
      setFresh({ id, value: r });
      try {
        await onSave(r);
      } catch {
        toast.error(t("languageCheck.assessment.saveError"));
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error(e instanceof Error ? e.message : t("languageCheck.assessment.error"));
      }
    } finally {
      setLoading(false);
    }
  }

  // Bullets quote long runs of learner text (English in ASCII quotes joined
  // by CJK punctuation, e.g. "xxx"、"yyy"); without a soft-wrap rule their
  // min-content width blows the grid past the card/dialog edge.
  const bullets = (items: { en: string; zh: string }[]) =>
    items.map((b, i) => <li key={i}>{language === "zh" ? b.zh : b.en}</li>);

  return (
    <div className="overflow-hidden rounded-xl border bg-gradient-to-br from-violet-50 to-sky-50 p-4 dark:from-violet-950/30 dark:to-sky-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Award className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("languageCheck.assessment.title")}</p>
            <p className="break-words text-xs text-muted-foreground">
              {t("languageCheck.assessment.subtitle")}
              {result &&
                ` · ${t("languageCheck.assessment.assessedOn", {
                  date: new Date(result.assessedAt).toLocaleString(),
                })}`}
            </p>
          </div>
        </div>
        <Button
          size="lg"
          onClick={run}
          disabled={loading}
          variant={result ? "outline" : "default"}
          className={cn(!result && "bg-violet-600 text-white hover:bg-violet-700")}
        >
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading
            ? t("languageCheck.assessment.working")
            : result
              ? t("languageCheck.assessment.again")
              : t("languageCheck.assessment.button")}
        </Button>
      </div>

      {result && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("languageCheck.assessment.overall")}
              </span>
              <span className="text-4xl font-bold tabular-nums">
                {result.overall}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  {t("languageCheck.assessment.scale")}
                </span>
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("languageCheck.assessment.subScores")}
              </span>
              {LANGUAGE_ASSESSMENT_DIMENSIONS.map((d) => (
                <div key={d} className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 sm:w-44">
                    {t(`languageCheck.assessment.dim.${d}`)}
                  </span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", tone(result.scores[d]))}
                      style={{ width: `${(result.scores[d] / 7) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-semibold tabular-nums">
                    {result.scores[d]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-lg border bg-card p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {t("languageCheck.assessment.strengths")}
              </p>
              <ul className="list-disc space-y-1.5 pl-5 text-sm [overflow-wrap:anywhere]">
                {bullets(result.strengths)}
              </ul>
            </div>
            <div className="min-w-0 rounded-lg border bg-card p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                {t("languageCheck.assessment.weaknesses")}
              </p>
              <ul className="list-disc space-y-1.5 pl-5 text-sm [overflow-wrap:anywhere]">
                {bullets(result.weaknesses)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
