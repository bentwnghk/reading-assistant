"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Award, CheckCircle2, ChevronDown, LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/style";
import useLanguageCheck from "@/hooks/useLanguageCheck";
import {
  CONTENT_ASSESSMENT_DIMENSIONS,
  LANGUAGE_ASSESSMENT_DIMENSIONS,
  ORGANIZATION_ASSESSMENT_DIMENSIONS,
} from "@/constants/readingPrompts";
import type { ExplanationLanguage } from "@/store/languageCheck";

interface AssessmentPanelProps {
  essay: Pick<
    LanguageCheckEssay,
    "id" | "checkedText" | "transcript" | "corrections" | "assessment"
  > &
    Partial<
      Pick<LanguageCheckEssay, "title" | "topic" | "essayType" | "questionImage">
    >;
  language: ExplanationLanguage;
  /**
   * Whether an essay that already carries an assessment may be assessed
   * again. False for students in the owner workspace — their saved result
   * stays visible but becomes read-only (only staff may re-assess). Saving
   * the FIRST assessment is always allowed. Defaults to true (staff log).
   */
  allowReassess?: boolean;
  /** Persists a fresh assessment; throwing shows a toast (result is still shown). */
  onSave: (assessment: LanguageCheckAssessment) => Promise<void>;
}

const DIMENSIONS: Record<"content" | "language" | "organization", readonly string[]> = {
  content: CONTENT_ASSESSMENT_DIMENSIONS,
  language: LANGUAGE_ASSESSMENT_DIMENSIONS,
  organization: ORGANIZATION_ASSESSMENT_DIMENSIONS,
};

function tone(score: number): string {
  if (score >= 6) return "bg-emerald-500";
  if (score >= 4) return "bg-sky-500";
  if (score >= 3) return "bg-amber-500";
  return "bg-rose-500";
}

export default function AssessmentPanel({
  essay,
  language,
  allowReassess = true,
  onSave,
}: AssessmentPanelProps) {
  const { t } = useTranslation();
  const { assessLanguage } = useLanguageCheck();
  const [fresh, setFresh] = useState<{
    id: string;
    value: LanguageCheckAssessment;
  } | null>(null);
  const result =
    fresh && fresh.id === essay.id ? fresh.value : essay.assessment;
  const [loading, setLoading] = useState(false);
  // Ephemeral view state (like ResultsView's category filter): whether the
  // result body is expanded. A fresh assessment always expands it again.
  const [open, setOpen] = useState(true);
  // Once an assessment exists, running again is a staff-only action.
  const canRun = !result || allowReassess;

  async function run() {
    if (loading || !canRun) return;
    setLoading(true);
    const id = essay.id;
    try {
      const r = await assessLanguage(essay);
      setFresh({ id, value: r });
      setOpen(true);
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
  const criteria: {
    key: "content" | "language" | "organization";
    score: number;
    subScores?: Record<string, number>;
    strengths: { en: string; zh: string }[];
    weaknesses: { en: string; zh: string }[];
  }[] = result
    ? [
        ...(result.content ? [{ key: "content" as const, ...result.content, subScores: result.content.scores }] : []),
        {
          key: "language" as const,
          score: result.languageScore ?? result.overall,
          subScores: result.scores,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
        },
        ...(result.organization
          ? [{ key: "organization" as const, ...result.organization, subScores: result.organization.scores }]
          : []),
      ]
    : [];
  const bullets = (items: { en: string; zh: string }[]) =>
    items.map((b, i) => <li key={i}>{language === "zh" ? b.zh : b.en}</li>);

  return (
    <div className="shrink-0 overflow-hidden rounded-xl border bg-gradient-to-br from-violet-50 to-sky-50 p-4 dark:from-violet-950/30 dark:to-sky-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {result && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-expanded={open}
              aria-controls="lc-assessment-body"
              title={t(
                open
                  ? "languageCheck.assessment.collapse"
                  : "languageCheck.assessment.expand",
              )}
              onClick={() => setOpen((o) => !o)}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              />
              <span className="sr-only">
                {t(
                  open
                    ? "languageCheck.assessment.collapse"
                    : "languageCheck.assessment.expand",
                )}
              </span>
            </Button>
          )}
          <Award className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {t("languageCheck.assessment.title")}
              {/* Collapsed: keep the headline score visible in the header. */}
              {result && !open && (
                <span className="rounded-full bg-violet-600/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
                  {result.overall} {t("languageCheck.assessment.overallScale")}
                </span>
              )}
            </p>
            <p className="break-words text-xs text-muted-foreground">
              {t("languageCheck.assessment.subtitle")}
              {result &&
                ` · ${t("languageCheck.assessment.assessedOn", {
                  date: new Date(result.assessedAt).toLocaleString(),
                })}`}
            </p>
          </div>
        </div>
        {canRun && (
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
        )}
      </div>

      {result && open && (
        <div id="lc-assessment-body" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("languageCheck.assessment.overall")}
              </span>
              <span className="text-4xl font-bold tabular-nums">
                {result.overall}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  {t("languageCheck.assessment.overallScale")}
                </span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {criteria.map((c) => (
                <div
                  key={c.key}
                  className="flex min-w-0 flex-col items-center justify-center rounded-lg border bg-card p-3 text-center"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {t(`languageCheck.assessment.criteria.${c.key}`)}
                  </span>
                  <span className="text-2xl font-bold tabular-nums">
                    {c.score}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      {t("languageCheck.assessment.scale")}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {!result.content && (
            <p className="rounded-lg border border-dashed bg-card/60 px-3 py-2 text-xs text-muted-foreground">
              {t("languageCheck.assessment.legacy")}
            </p>
          )}

          {criteria.map((c) => (
            <section
              key={c.key}
              className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {t(`languageCheck.assessment.criteria.${c.key}`)}
                </h3>
                <span className="rounded-full bg-violet-600/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
                  {c.score} {t("languageCheck.assessment.scale")}
                </span>
              </div>
              {c.subScores && (
                <div className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("languageCheck.assessment.subScores")}
                  </span>
                  {DIMENSIONS[c.key].map((d) => (
                    <div key={d} className="flex min-w-0 items-center gap-2 text-sm">
                      <span className="w-32 shrink-0 sm:w-44">
                        {t(`languageCheck.assessment.dim.${d}`)}
                      </span>
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", tone(c.subScores?.[d] ?? 0))}
                          style={{ width: `${((c.subScores?.[d] ?? 0) / 7) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right font-semibold tabular-nums">
                        {c.subScores?.[d] ?? "–"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="min-w-0 rounded-lg border bg-card p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t("languageCheck.assessment.strengths")}
                  </p>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm [overflow-wrap:anywhere]">
                    {bullets(c.strengths)}
                  </ul>
                </div>
                <div className="min-w-0 rounded-lg border bg-card p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    {t("languageCheck.assessment.weaknesses")}
                  </p>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm [overflow-wrap:anywhere]">
                    {bullets(c.weaknesses)}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
