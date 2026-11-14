"use client";

import { generateText, streamText } from "ai";
import i18next from "i18next";
import { toast } from "sonner";
import {
  LANGUAGE_CHECK_ILLEGIBLE_MARKER,
  isExpressionCategory,
} from "@/constants/languageCheck";
import useModelProvider from "@/hooks/useAiProvider";
import { useSettingStore } from "@/store/setting";
import {
  useLanguageCheckStore,
  getLanguageCheckAbort,
  removeLanguageCheckAbort,
} from "@/store/languageCheck";
import {
  extractHandwrittenEssayPrompt,
  transcriberSystemPrompt,
  verifyTranscriptionPrompt,
  languageCheckPrompt,
  languageCheckSystemPrompt,
  languageAssessmentPrompt,
  languageAssessmentSystemPrompt,
  jsAssessmentSystemPrompt,
  tsaAssessmentSystemPrompt,
  enhancedEssayPrompt,
  enhancedEssaySystemPrompt,
  topicAiReportSystemPrompt,
  topicAiReportPrompt,
} from "@/constants/readingPrompts";
import {
  languageAssessmentSchema,
  jsLanguageAssessmentSchema,
  tsaLanguageAssessmentSchema,
  type StoredLanguageAssessment,
} from "@/utils/languageCheckAssessment";
import {
  enhancedOutputSchema,
  type StoredEnhanced,
} from "@/utils/languageCheckEnhanced";
import { aiInsightsSchema } from "@/utils/languageCheckAiReport";
import { LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE } from "@/constants/languageCheck";
import { fetchAppConfig } from "@/utils/app-config";
import { parseError } from "@/utils/error";
import {
  acceptVerifiedTranscript,
  chunkParagraphs,
  deriveTitle,
  joinPages,
  parseRawErrors,
  resolveErrors,
  splitParagraphs,
  stripJsonFences,
  type RawLanguageError,
} from "@/utils/languageCheck";

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /aborted/i.test(error.message))
  );
}

/**
 * Translate well-known AI-gateway failures into actionable messages;
 * anything else keeps its `parseError` form. These gates are what users
 * actually hit when they have not subscribed or configured access (the
 * /api/ai/subscription route and the middleware HMAC check), and the raw
 * `[FORBIDDEN]: ...` strings alone don't tell them what to do.
 */
function describeGenerationError(error: unknown): string {
  const raw = parseError(error);
  if (raw.includes("No active subscription")) {
    return i18next.t("languageCheck.errors.noSubscription");
  }
  if (raw.includes("No permissions")) {
    return i18next.t("languageCheck.errors.noAccessPassword");
  }
  if (raw.includes("server does not have an API key")) {
    return i18next.t("languageCheck.errors.serverKeyMissing");
  }
  if (raw.includes("Unauthorized")) {
    return i18next.t("languageCheck.errors.unauthorized");
  }
  return raw;
}

let fallbackModelPromise: Promise<string> | null = null;
function getFallbackModel(): Promise<string> {
  if (!fallbackModelPromise) {
    fallbackModelPromise = fetchAppConfig()
      .then((c) => c.fallbackModel || "gemini-3.8-flash")
      .catch(() => "gemini-3.8-flash");
  }
  return fallbackModelPromise;
}

/** Writing-task context of an essay (snapshot saved at upload). */
function taskOf(
  essay: Partial<
    Pick<LanguageCheckEssay, "title" | "topic" | "essayType" | "questionImage">
  >,
): LanguageCheckTask | undefined {
  if (!essay.topic && !essay.essayType && !essay.questionImage) return undefined;
  return {
    title: essay.title,
    topic: essay.topic,
    essayType: essay.essayType,
    questionImage: essay.questionImage || undefined,
  };
}

/** Per-category error counts handed to the assessment prompt as evidence. */
function summarizeErrors(corrections: Pick<LanguageCheckError, "category">[]): string {
  const counts = new Map<string, number>();
  for (const e of corrections) {
    counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  }
  return counts.size
    ? [...counts].map(([c, n]) => `- ${c}: ${n}`).join("\n")
    : "- none detected";
}

/**
 * OCR + language-check actions for the Writing Assessment feature. Independent of
 * useReadingAssistant / the reading store: all state lives in the
 * languageCheck store so it survives SPA navigation.
 */
export default function useLanguageCheck() {
  const { createModelProvider } = useModelProvider();

  /**
   * One vision call per page, run sequentially. Streams the first pass into the
   * essay transcript; when the "verify" preference is on, a second call per
   * page shows the model its own draft and asks it to revert silent fixes.
   */
  async function transcribe(essayId: string): Promise<void> {
    const store = useLanguageCheckStore.getState();
    if (store.activeGenerations["ocr"]) return;
    const essay = store.active;
    if (!essay || essay.id !== essayId || essay.images.length === 0) return;

    const { ocrModel } = useSettingStore.getState();
    const verify = useLanguageCheckStore.getState().verifyTranscription;
    const ac = getLanguageCheckAbort("ocr");
    store.setGenerating("ocr", true);
    store.setGeneratingEssayId(essayId);
    const loadingToast = toast.info(i18next.t("languageCheck.ocr.working"), {
      duration: Infinity,
    });

    const pages: string[] = [];
    let restored = 0;
    try {
      const model = await createModelProvider(ocrModel);
      for (let i = 0; i < essay.images.length; i++) {
        if (ac.signal.aborted) throw new DOMException("Aborted", "AbortError");
        useLanguageCheckStore
          .getState()
          .setProgress({ current: i + 1, total: essay.images.length });

        let streamError: unknown = null;
        const result = streamText({
          model,
          // Transcriber persona only (never the teacher/marker prompt): vision
          // models default to returning clean text, which erases the mistakes.
          // (temperature is already 0 — the AI SDK v4 default.)
          system: transcriberSystemPrompt(),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: extractHandwrittenEssayPrompt() },
                {
                  type: "image",
                  image: essay.images[i],
                  providerOptions: { openai: { imageDetail: "high" } },
                },
              ],
            },
          ],
          abortSignal: ac.signal,
          // Capture rather than swallow: streamText routes request failures
          // here and the textStream just ends, so without this the real
          // error (e.g. 403 "No active subscription") would be lost.
          onError: (event) => {
            streamError = event.error;
          },
        });

        let pageText = "";
        for await (const part of result.textStream) {
          pageText += part;
          // Live preview: committed pages + the page being streamed.
          useLanguageCheckStore
            .getState()
            .updateLocal(essayId, { transcript: joinPages([...pages, pageText]) });
        }
        // A captured stream error means the page is incomplete (usually no
        // text at all when an access gate blocked the request): surface the
        // real cause instead of blaming the photo quality. Only a clean
        // stream that still yields no text falls back to the "unreadable
        // page" message.
        if (streamError !== null) throw streamError;
        if (!pageText.trim()) {
          throw new Error(i18next.t("languageCheck.ocr.empty", { page: i + 1 }));
        }

        if (verify) {
          toast.info(
            i18next.t("languageCheck.ocr.verifying", {
              current: i + 1,
              total: essay.images.length,
            }),
            { id: loadingToast, duration: Infinity },
          );
          try {
            const second = await generateText({
              model,
              system: transcriberSystemPrompt(),
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: verifyTranscriptionPrompt(pageText) },
                    {
                      type: "image",
                      image: essay.images[i],
                      providerOptions: { openai: { imageDetail: "high" } },
                    },
                  ],
                },
              ],
              abortSignal: ac.signal,
            });
            const verified = acceptVerifiedTranscript(
              pageText,
              second.text,
              LANGUAGE_CHECK_ILLEGIBLE_MARKER,
            );
            if (verified.accepted) pageText = verified.text;
            if (verified.accepted && verified.changedWords > 0) restored += verified.changedWords;
            useLanguageCheckStore
              .getState()
              .updateLocal(essayId, { transcript: joinPages([...pages, pageText]) });
          } catch (verifyError) {
            // The draft is already a valid transcript; verification is a bonus.
            if (ac.signal.aborted || isAbortError(verifyError)) throw verifyError;
            console.warn("Transcript verification failed, keeping draft:", verifyError);
          }
          toast.info(i18next.t("languageCheck.ocr.working"), {
            id: loadingToast,
            duration: Infinity,
          });
        }
        pages.push(pageText);
      }

      const transcript = joinPages(pages);
      const current = useLanguageCheckStore.getState().active;
      const title =
        (current?.id === essayId && current.title) || deriveTitle(transcript, "");
      await useLanguageCheckStore.getState().save(essayId, {
        transcript,
        title,
        status: "transcribed",
        ocrModel,
        // New transcript invalidates any earlier check.
        checkedText: "",
        corrections: [],
        droppedCount: 0,
        assessment: null,
        enhanced: null,
      });
      toast.success(
        verify && restored > 0
          ? i18next.t("languageCheck.ocr.doneVerified", { count: restored })
          : i18next.t("languageCheck.ocr.done"),
      );
    } catch (error) {
      if (isAbortError(error) || ac.signal.aborted) {
        toast.warning(i18next.t("languageCheck.cancelled"));
      } else {
        console.error("Grammar check OCR failed:", error);
        toast.error(describeGenerationError(error));
      }
      // Keep whatever text was recognised so far for manual completion.
      if (pages.length > 0) {
        const partial = joinPages(pages);
        useLanguageCheckStore.getState().updateLocal(essayId, { transcript: partial });
        useLanguageCheckStore
          .getState()
          .save(essayId, { transcript: partial, status: "transcribed" })
          .catch(() => {});
      }
    } finally {
      toast.dismiss(loadingToast);
      removeLanguageCheckAbort("ocr");
      const s = useLanguageCheckStore.getState();
      s.setProgress(null);
      s.setGenerating("ocr", false);
      s.setGeneratingEssayId(null);
    }
  }

  async function generateWithFallback(
    model: string,
    system: string,
    prompt: string,
    signal: AbortSignal,
    /** Optional question-paper image attached to the prompt (vision models). */
    image?: string,
  ): Promise<string> {
    const run = async (name: string) => {
      const provider = await createModelProvider(name);
      const result = await generateText({
        model: provider,
        system,
        ...(image
          ? {
              messages: [
                {
                  role: "user" as const,
                  content: [
                    { type: "text" as const, text: prompt },
                    {
                      type: "image" as const,
                      image,
                      providerOptions: { openai: { imageDetail: "high" } },
                    },
                  ],
                },
              ],
            }
          : { prompt }),
        abortSignal: signal,
      });
      return result.text;
    };
    try {
      return await run(model);
    } catch (error) {
      if (signal.aborted || isAbortError(error)) throw error;
      const fallback = await getFallbackModel();
      if (fallback === model) throw error;
      try {
        return await run(fallback);
      } catch {
        throw error;
      }
    }
  }

  /** Result of a finished check run, handed to the caller's persist step. */
  interface CheckRunResult {
    checkedText: string;
    corrections: LanguageCheckError[];
    checkModel: string;
    droppedCount: number;
    /** Set when the follow-up assessment call finished successfully. */
    assessment?: StoredLanguageAssessment;
  }

  /**
   * Shared check pipeline: chunk the transcript → one AI call per chunk →
   * anchor the reports → persist. Used by the owner workspace (`runCheck`,
   * persists through the owner essay PATCH) and the staff essay log
   * (`runStaffCheck`, persists through the scope-checked staff endpoint).
   * Generation state lives in the languageCheck store, so only one check can
   * run at a time app-wide and spinners survive SPA navigation.
   */
  async function runCheckPipeline(
    essayId: string,
    text: string,
    persist: (result: CheckRunResult) => Promise<void>,
    task?: LanguageCheckTask,
    /** Also run the AI writing assessment, as a second AI call after the error check. */
    withAssessment = false,
  ): Promise<boolean> {
    if (useLanguageCheckStore.getState().activeGenerations["language-check"])
      return false;
    const paragraphs = splitParagraphs(text);
    if (paragraphs.length === 0) {
      toast.error(i18next.t("languageCheck.check.noText"));
      return false;
    }

    const { languageCheckModel } = useSettingStore.getState();
    const ac = getLanguageCheckAbort("language-check");
    // Persistent toast for the whole run, styled like the other AI generation
    // toasts (toast.info); dismissed in `finally` once a result toast shows.
    const progressToastId = toast.info(i18next.t("languageCheck.check.working"), {
      duration: Infinity,
      description: i18next.t("languageCheck.check.waitHint"),
    });
    useLanguageCheckStore.getState().setGenerating("language-check", true);
    useLanguageCheckStore.getState().setGeneratingEssayId(essayId);

    try {
      const chunks = chunkParagraphs(paragraphs);
      const rawAll: RawLanguageError[] = [];
      let invalid = 0;

      for (let i = 0; i < chunks.length; i++) {
        useLanguageCheckStore
          .getState()
          .setProgress({ current: i + 1, total: chunks.length });
        const output = await generateWithFallback(
          languageCheckModel,
          languageCheckSystemPrompt(),
          languageCheckPrompt(chunks[i], task),
          ac.signal,
          task?.questionImage,
        );
        let json: unknown;
        try {
          json = JSON.parse(stripJsonFences(output));
        } catch {
          throw new Error(i18next.t("languageCheck.check.parseError"));
        }
        const { errors, invalid: bad } = parseRawErrors(json);
        rawAll.push(...errors);
        invalid += bad;
      }

      const { errors, dropped } = resolveErrors(text, rawAll);

      // Sequential on purpose: the assessment prompt uses the detected error
      // counts as evidence, so it runs once the error check has resolved.
      // An assessment failure keeps the check result (Assess can be retried).
      let assessment: StoredLanguageAssessment | undefined;
      if (withAssessment) {
        useLanguageCheckStore.getState().setProgress(null);
        try {
          assessment = await assessText(
            text,
            summarizeErrors(errors),
            task,
            ac.signal,
            task?.questionImage,
          );
        } catch (e) {
          if (!isAbortError(e) && !ac.signal.aborted) {
            console.error("Writing assessment failed:", e);
            toast.error(
              e instanceof Error
                ? e.message
                : i18next.t("languageCheck.assessment.error"),
            );
          }
        }
      }
      if (ac.signal.aborted) throw new DOMException("Aborted", "AbortError");

      await persist({
        checkedText: text,
        corrections: errors,
        checkModel: languageCheckModel,
        droppedCount: dropped + invalid,
        assessment,
      });

      if (errors.length === 0) {
        toast.success(i18next.t("languageCheck.check.noErrors"));
      } else {
        const suggestions = errors.filter((e) =>
          isExpressionCategory(e.category),
        ).length;
        toast.success(
          i18next.t("languageCheck.check.done", {
            errors: errors.length - suggestions,
            suggestions,
          }),
        );
      }
      return true;
    } catch (error) {
      if (isAbortError(error) || ac.signal.aborted) {
        toast.warning(i18next.t("languageCheck.cancelled"));
      } else {
        console.error("Grammar check failed:", error);
        toast.error(describeGenerationError(error));
      }
      return false;
    } finally {
      toast.dismiss(progressToastId);
      removeLanguageCheckAbort("language-check");
      const s = useLanguageCheckStore.getState();
      s.setProgress(null);
      s.setGenerating("language-check", false);
      s.setGeneratingEssayId(null);
    }
  }

  /** Runs the writing check on the essay's current transcript. */
  async function runCheck(essayId: string): Promise<boolean> {
    const essay = useLanguageCheckStore.getState().active;
    if (!essay || essay.id !== essayId) return false;
    return runCheckPipeline(
      essayId,
      essay.transcript,
      async ({ assessment, ...result }) => {
        // A fresh check resets any saved assessment first; the new assessment
        // is then saved as a "first" assessment (students may not overwrite).
        await useLanguageCheckStore.getState().save(essayId, {
          transcript: essay.transcript,
          status: "checked",
          ...result,
          assessment: null,
          enhanced: null,
        });
        if (!assessment) return;
        try {
          await useLanguageCheckStore.getState().save(essayId, { assessment });
        } catch {
          toast.error(i18next.t("languageCheck.assessment.saveError"));
        }
      },
      taskOf(essay),
      true,
    );
  }

  /**
   * Staff re-check of a learner's essay from the staff essay log dialog. The
   * essay belongs to a student inside the caller's staff scope (not
   * necessarily the caller), so results persist through the scope-checked
   * staff endpoint rather than the owner PATCH. A fresh check resets any
   * saved assessment server-side, exactly like an owner re-check.
   */
  async function runStaffCheck(
    essay: Pick<LanguageCheckStaffDetail, "id" | "transcript"> &
      Partial<
        Pick<
          LanguageCheckStaffDetail,
          "title" | "topic" | "essayType" | "questionImage"
        >
      >,
  ): Promise<boolean> {
    return runCheckPipeline(essay.id, essay.transcript, async ({ assessment, ...result }) => {
      const send = async (url: string, method: string, body: unknown) => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          try {
            const data = (await res.json()) as { error?: string };
            if (data.error) message = data.error;
          } catch {
            // Non-JSON body — keep the generic message.
          }
          throw new Error(message);
        }
      };
      await send(`/api/writing-assessment/staff/${essay.id}/recheck`, "POST", result);
      if (!assessment) return;
      try {
        await send(`/api/writing-assessment/staff/${essay.id}/assessment`, "PUT", assessment);
      } catch {
        toast.error(i18next.t("languageCheck.assessment.saveError"));
      }
    }, taskOf(essay), true);
  }

  /** One AI call: Content / Language / Organization assessment of `text`. */
  async function assessText(
    text: string,
    errorSummary: string,
    task: LanguageCheckTask | undefined,
    signal: AbortSignal | undefined,
    image: string | undefined,
  ): Promise<StoredLanguageAssessment> {
    const { languageCheckModel } = useSettingStore.getState();
    const ac = new AbortController();
    signal?.addEventListener("abort", () => ac.abort());
    try {
      const isJs = task?.essayType === "js-writing";
      const isTsa = task?.essayType === "tsa-writing";
      const output = await generateWithFallback(
        languageCheckModel,
        isTsa
          ? tsaAssessmentSystemPrompt()
          : isJs
            ? jsAssessmentSystemPrompt()
            : languageAssessmentSystemPrompt(),
        languageAssessmentPrompt(text, errorSummary, task),
        ac.signal,
        image,
      );
      const json: unknown = JSON.parse(stripJsonFences(output));
      const parsed = isTsa
        ? tsaLanguageAssessmentSchema.parse(json)
        : isJs
          ? jsLanguageAssessmentSchema.parse(json)
          : languageAssessmentSchema.parse(json);
      return { ...parsed, assessedAt: Date.now(), model: languageCheckModel };
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (error instanceof SyntaxError || (error as Error)?.name === "ZodError") {
        throw new Error(i18next.t("languageCheck.check.parseError"));
      }
      throw new Error(describeGenerationError(error));
    }
  }

  /** Stateless assessment of a checked essay: each criterion 0-7, overall = sum (0-21). */
  async function assessLanguage(
    essay: Pick<
      LanguageCheckEssay,
      "checkedText" | "transcript" | "corrections"
    > &
      Partial<
        Pick<LanguageCheckEssay, "title" | "topic" | "essayType" | "questionImage">
      >,
    signal?: AbortSignal,
  ): Promise<StoredLanguageAssessment> {
    const text = (essay.checkedText || essay.transcript).trim();
    const summary = summarizeErrors(essay.corrections);
    return assessText(text, summary, taskOf(essay), signal, essay.questionImage || undefined);
  }

  /** Stateless AI enhanced essays (light polish + heavy HKDSE 5** rewrite). */
  async function enhanceEssay(
    essay: Pick<
      LanguageCheckEssay,
      "checkedText" | "transcript" | "corrections"
    > &
      Partial<
        Pick<LanguageCheckEssay, "title" | "topic" | "essayType" | "questionImage">
      >,
    signal?: AbortSignal,
  ): Promise<StoredEnhanced> {
    const { languageCheckModel } = useSettingStore.getState();
    const text = (essay.checkedText || essay.transcript).trim();
    const ac = new AbortController();
    signal?.addEventListener("abort", () => ac.abort());
    try {
      const output = await generateWithFallback(
        languageCheckModel,
        enhancedEssaySystemPrompt(),
        enhancedEssayPrompt(text, summarizeErrors(essay.corrections), taskOf(essay)),
        ac.signal,
        essay.questionImage || undefined,
      );
      const parsed = enhancedOutputSchema.parse(JSON.parse(stripJsonFences(output)));
      return { ...parsed, generatedAt: Date.now(), model: languageCheckModel };
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (error instanceof SyntaxError || (error as Error)?.name === "ZodError") {
        throw new Error(i18next.t("languageCheck.check.parseError"));
      }
      throw new Error(describeGenerationError(error));
    }
  }


  /**
   * Staff: generate the comprehensive AI assessment report for a writing topic.
   * Evidence (anonymous class corrections) comes from the server; the result is
   * saved server-side with a snapshot of the class statistics.
   */
  async function generateTopicAiReport(
    topicId: string,
    language: "en" | "zh",
    signal?: AbortSignal,
  ): Promise<LanguageCheckAiReport> {
    const { languageCheckModel } = useSettingStore.getState();
    const base = `/api/writing-assessment/staff/topic-reports/${encodeURIComponent(topicId)}`;
    const getJson = async (url: string) => {
      const res = await fetch(url, { signal });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      return body;
    };
    const [report, ev] = await Promise.all([
      getJson(base) as Promise<LanguageCheckTopicReport>,
      getJson(`${base}/ai-report?evidence=1`) as Promise<{ evidence: LanguageCheckAiEvidence }>,
    ]);
    const evidence = ev.evidence;
    if (evidence.studentsAnalysed === 0) {
      throw new Error(i18next.t("languageCheck.aiReport.noData"));
    }

    const { max, averages } = report;
    const pct = (v: number | null, m: number) =>
      v === null || m <= 0 ? "n/a" : `${v}/${m} (${Math.round((v / m) * 100)}%)`;
    const stats = [
      `Students analysed: ${evidence.studentsAnalysed}` +
        (report.studentCount ? ` of ${report.studentCount} in class` : ""),
      `Average overall: ${pct(averages.overall, max.overall)}`,
      ...(["content", "language", "organization", "features"] as const)
        .filter((k) => max[k] > 0)
        .map((k) => `Average ${k}: ${pct(averages[k], max[k])}`),
      `Score bands (<20, 20-39, 40-59, 60-79, 80+ %): ${report.distribution.join(", ")}`,
      `Average words: ${report.avgWords ?? "n/a"}; average comments per essay: ${report.avgErrors ?? "n/a"}`,
    ].join("\n");

    const lines: string[] = [];
    lines.push("### Error / suggestion categories (ranked by students affected)");
    for (const c of evidence.categories.slice(0, 12)) {
      lines.push(
        `- ${c.category}${c.expression ? " [suggestion tier]" : ""}: ${c.count} items, ${c.students} students`,
      );
      for (const e of c.examples) {
        lines.push(`    e.g. "${e.original}" -> "${e.correction}" (${e.explanation})`);
      }
    }
    for (const k of ["content", "language", "organization", "features"] as const) {
      const n = evidence.notes[k];
      if (!n.strengths.length && !n.weaknesses.length) continue;
      lines.push(`### Marker notes on ${k} (from individual assessments)`);
      if (n.strengths.length) lines.push(`Strengths: ${n.strengths.join(" | ")}`);
      if (n.weaknesses.length) lines.push(`Weaknesses: ${n.weaknesses.join(" | ")}`);
    }

    const ac = new AbortController();
    signal?.addEventListener("abort", () => ac.abort());
    let insights: LanguageCheckAiInsights;
    try {
      const output = await generateWithFallback(
        languageCheckModel,
        topicAiReportSystemPrompt(),
        topicAiReportPrompt({
          title: report.topic.title,
          task: report.topic.topic,
          essayType: LANGUAGE_CHECK_ESSAY_TYPE_GUIDANCE[report.topic.essayType]?.label ?? report.topic.essayType,
          className: report.topic.className,
          language,
          stats,
          evidence: lines.join("\n"),
        }),
        ac.signal,
      );
      insights = aiInsightsSchema.parse(JSON.parse(stripJsonFences(output)));
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (error instanceof SyntaxError || (error as Error)?.name === "ZodError") {
        throw new Error(i18next.t("languageCheck.check.parseError"));
      }
      throw new Error(describeGenerationError(error));
    }
    // Only categories the evidence actually contains may be referenced.
    const known = new Set(evidence.categories.map((c) => c.category));
    insights.mistakes = insights.mistakes.filter((m) => known.has(m.category));

    const res = await fetch(`${base}/ai-report`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: languageCheckModel,
        categories: evidence.categories,
        insights,
      }),
      signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
    return (body as { saved: LanguageCheckAiReport }).saved;
  }

  return {
    transcribe,
    generateTopicAiReport,
    runCheck,
    runStaffCheck,
    assessLanguage,
    enhanceEssay,
    generate: generateWithFallback,
  };
}
