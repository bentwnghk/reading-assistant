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
} from "@/constants/readingPrompts";
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

let fallbackModelPromise: Promise<string> | null = null;
function getFallbackModel(): Promise<string> {
  if (!fallbackModelPromise) {
    fallbackModelPromise = fetchAppConfig()
      .then((c) => c.fallbackModel || "gemini-3.8-flash")
      .catch(() => "gemini-3.8-flash");
  }
  return fallbackModelPromise;
}

/**
 * OCR + language-check actions for the Language Check feature. Independent of
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

    const { visionModel } = useSettingStore.getState();
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
      const model = await createModelProvider(visionModel);
      for (let i = 0; i < essay.images.length; i++) {
        if (ac.signal.aborted) throw new DOMException("Aborted", "AbortError");
        useLanguageCheckStore
          .getState()
          .setProgress({ current: i + 1, total: essay.images.length });

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
          onError: () => {},
        });

        let pageText = "";
        for await (const part of result.textStream) {
          pageText += part;
          // Live preview: committed pages + the page being streamed.
          useLanguageCheckStore
            .getState()
            .updateLocal(essayId, { transcript: joinPages([...pages, pageText]) });
        }
        // streamText swallows request errors into onError; an empty stream is
        // the observable symptom.
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
        ocrModel: visionModel,
        // New transcript invalidates any earlier check.
        checkedText: "",
        corrections: [],
        droppedCount: 0,
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
        console.error("Language check OCR failed:", error);
        toast.error(parseError(error));
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
  ): Promise<string> {
    const run = async (name: string) => {
      const provider = await createModelProvider(name);
      const result = await generateText({
        model: provider,
        system,
        prompt,
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

  /** Runs the language check on the essay's current transcript. */
  async function runCheck(essayId: string): Promise<boolean> {
    const store = useLanguageCheckStore.getState();
    if (store.activeGenerations["language-check"]) return false;
    const essay = store.active;
    if (!essay || essay.id !== essayId) return false;

    const text = essay.transcript;
    const paragraphs = splitParagraphs(text);
    if (paragraphs.length === 0) {
      toast.error(i18next.t("languageCheck.check.noText"));
      return false;
    }

    const { languageCheckModel } = useSettingStore.getState();
    const ac = getLanguageCheckAbort("language-check");
    store.setGenerating("language-check", true);
    store.setGeneratingEssayId(essayId);

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
          languageCheckPrompt(chunks[i]),
          ac.signal,
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
      await useLanguageCheckStore.getState().save(essayId, {
        transcript: text,
        status: "checked",
        checkedText: text,
        corrections: errors,
        checkModel: languageCheckModel,
        droppedCount: dropped + invalid,
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
        console.error("Language check failed:", error);
        toast.error(parseError(error));
      }
      return false;
    } finally {
      removeLanguageCheckAbort("language-check");
      const s = useLanguageCheckStore.getState();
      s.setProgress(null);
      s.setGenerating("language-check", false);
      s.setGeneratingEssayId(null);
    }
  }

  return { transcribe, runCheck };
}
