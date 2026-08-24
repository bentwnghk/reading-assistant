import { streamText, smoothStream, generateText } from "ai";
import { z } from "zod";
import { toast } from "sonner";
import i18next from "i18next";
import { markLastOpenedSession, useSettingStore } from "@/store/setting";
import { useReadingStore, setStreamingFlag } from "@/store/reading";
import {
  getAbortController,
  removeAbortController,
} from "@/store/reading";
import { useHistoryStore } from "@/store/history";
import useModelProvider from "@/hooks/useAiProvider";
import {
  getSystemPrompt,
  extractTextFromImagePrompt,
  extractTitleFromTextPrompt,
  generateSummaryPrompt,
  translateSummaryPrompt,
  generatePreReadingPrompt,
  adaptTextPrompt,
  simplifyTextPrompt,
  generateMindMapPrompt,
  translateMindMapPrompt,
  generateReadingTestPrompt,
  generateTargetedPracticePrompt,
  generateGlossaryPrompt,
  suggestVocabularyPrompt,
  readingTutorSystemPrompt,
  analyzeGrammarTopicsPrompt,
  generateGrammarLessonPrompt,
  evaluateGrammarPracticePrompt,
  generateGrammarQuizPrompt,
  evaluateGrammarRewritePrompt,
  generateGrammarScramblePrompt,
  generateGrammarWorkshopPrompt,
  generateErrorSurgeryPrompt,
  generateGrammarQuestionsPrompt,
  generateReadingTextPrompt,
  generateCollocationsPrompt,
  getAgeLevelMapping,
  shiftCefrLevel,
  READING_TEXT_TYPES,
  type ReadingTextType,
} from "@/constants/readingPrompts";
import { parseError } from "@/utils/error";
import { logActivity } from "@/utils/activityLogger";
import { generateSignature } from "@/utils/signature";
import { computeSkillBreakdown } from "@/utils/skillProfile";

function smoothTextStream(type: "character" | "word" | "line") {
  return smoothStream({
    chunking: type === "character" ? /./ : type,
    delayInMs: 0,
  });
}

function sortQuestionsByParagraph(questions: ReadingTestQuestion[]): ReadingTestQuestion[] {
  return [...questions].sort((a, b) => {
    const aRef = typeof a.paragraphRef === "number" ? a.paragraphRef : Infinity;
    const bRef = typeof b.paragraphRef === "number" ? b.paragraphRef : Infinity;
    return aRef - bRef;
  });
}

function handleError(error: unknown) {
  console.error(error);
  const errorMessage = parseError(error);
  toast.error(errorMessage);
  return errorMessage;
}

function stripMarkdownFences(text: string): string {
  return text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

const mindMapDataSchema = z.object({
  root: z.string().min(1),
  branches: z
    .array(
      z.object({
        label: z.string().min(1),
        leaves: z.array(z.string().min(1)),
      })
    )
    .min(1),
});

/** Parse a stored mind map into structured `MindMapData`. Returns null for
 *  empty input or legacy sessions that stored Mermaid markdown instead of
 *  JSON. Mirrors `tryParseMindMapData` in MindMap.tsx (kept local because
 *  that one lives in a client component module). */
function tryParseMindMapData(raw: string): MindMapData | null {
  if (!raw || !raw.trim().startsWith("{")) return null;
  try {
    const parsed = mindMapDataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

let _fallbackModelPromise: Promise<string> | null = null;

function getFallbackModel(): Promise<string> {
  if (!_fallbackModelPromise) {
    _fallbackModelPromise = fetch("/api/config")
      .then((r) => r.json())
      .then((data) => data.fallbackModel || "gemini-3.7-flash")
      .catch(() => "gemini-3.7-flash");
  }
  return _fallbackModelPromise;
}

/**
 * Creates a closure that captures the current session ID and returns true as
 * long as the reading store still holds that same session.  Used to guard
 * writes inside async generation functions so a stale generation (whose
 * session was replaced via restore/reset) never clobbers the new session.
 *
 * When the guard is created with no active session (empty id) — which happens
 * when extraction runs on a freshly-reset store (e.g. via the Welcome dialog's
 * "Upload Image/PDF" card or the "New Text" button) — the guard binds to the
 * first non-empty id it observes. That id is the one lazily created by
 * `setExtractedText` for *this* extraction and must not be mistaken for a
 * session switch. Genuine session switches (restore/reset/loadFromRepository)
 * all call `abortAllGenerations()`, which remains the authoritative cancel
 * signal; the guard is only a complementary check.
 */
function createSessionGuard(): () => boolean {
  let sessionId = useReadingStore.getState().id;
  return () => {
    const currentId = useReadingStore.getState().id;
    if (!sessionId) {
      if (currentId) sessionId = currentId;
      return true;
    }
    return currentId === sessionId;
  };
}

/** True when the error is (or wraps) an AbortError. */
function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object" && "name" in error && (error as { name: string }).name === "AbortError") return true;
  return false;
}

/** Notifies the user that a generation was cancelled by a session switch. */
function notifyGenerationCancelled() {
  toast.warning(i18next.t("reading.generationCancelled"));
}

function useReadingAssistant() {
  const { 
    smoothTextStreamType, 
    visionModel: visionModelName,
    prereadingModel,
    summaryModel,
    mindMapModel,
    adaptedTextModel,
    simplifyModel,
    glossaryModel,
    suggestVocabModel,
    collocationModel,
  } = useSettingStore();
  const readingStore = useReadingStore();
  const { createModelProvider } = useModelProvider();
  const { setGenerating } = readingStore;

  async function grammarGenerateText(prompt: string, system: string, signal?: AbortSignal): Promise<string> {
    const { grammarModel: model } = useSettingStore.getState();
    const FALLBACK_MODEL = await getFallbackModel();
    try {
      const aiModel = await createModelProvider(model);
      const result = await generateText({ model: aiModel, system, prompt, abortSignal: signal });
      return stripMarkdownFences(result.text);
    } catch (primaryError) {
      if (signal?.aborted || isAbortError(primaryError)) throw primaryError;
      if (model === FALLBACK_MODEL) throw primaryError;
      console.warn("Grammar model failed, retrying with fallback:", FALLBACK_MODEL, primaryError);
      try {
        const fbModel = await createModelProvider(FALLBACK_MODEL);
        const result = await generateText({ model: fbModel, system, prompt, abortSignal: signal });
        return stripMarkdownFences(result.text);
      } catch (fallbackError) {
        console.error("Grammar fallback also failed:", fallbackError);
        throw primaryError;
      }
    }
  }

  async function readingTestGenerateText(prompt: string, system: string, signal?: AbortSignal): Promise<string> {
    const { readingTestModel: model } = useSettingStore.getState();
    const FALLBACK_MODEL = await getFallbackModel();
    try {
      const aiModel = await createModelProvider(model);
      const result = await generateText({ model: aiModel, system, prompt, abortSignal: signal });
      return stripMarkdownFences(result.text);
    } catch (primaryError) {
      if (signal?.aborted || isAbortError(primaryError)) throw primaryError;
      if (model === FALLBACK_MODEL) throw primaryError;
      console.warn("Reading test model failed, retrying with fallback:", FALLBACK_MODEL, primaryError);
      try {
        const fbModel = await createModelProvider(FALLBACK_MODEL);
        const result = await generateText({ model: fbModel, system, prompt, abortSignal: signal });
        return stripMarkdownFences(result.text);
      } catch (fallbackError) {
        console.error("Reading test fallback also failed:", fallbackError);
        throw primaryError;
      }
    }
  }

  async function glossaryGenerateText(prompt: string, system: string, model: string, signal?: AbortSignal): Promise<string> {
    const FALLBACK_MODEL = await getFallbackModel();
    try {
      const aiModel = await createModelProvider(model);
      const result = await generateText({ model: aiModel, system, prompt, abortSignal: signal });
      return stripMarkdownFences(result.text);
    } catch (primaryError) {
      if (signal?.aborted || isAbortError(primaryError)) throw primaryError;
      if (model === FALLBACK_MODEL) throw primaryError;
      console.warn("Glossary model failed, retrying with fallback:", FALLBACK_MODEL, primaryError);
      try {
        const fbModel = await createModelProvider(FALLBACK_MODEL);
        const result = await generateText({ model: fbModel, system, prompt, abortSignal: signal });
        return stripMarkdownFences(result.text);
      } catch (fallbackError) {
        console.error("Glossary fallback also failed:", fallbackError);
        throw primaryError;
      }
    }
  }

  async function mindMapGenerateText(prompt: string, system: string, model: string, signal?: AbortSignal): Promise<string> {
    const FALLBACK_MODEL = await getFallbackModel();
    try {
      const aiModel = await createModelProvider(model);
      const result = await generateText({ model: aiModel, system, prompt, abortSignal: signal });
      return stripMarkdownFences(result.text);
    } catch (primaryError) {
      if (signal?.aborted || isAbortError(primaryError)) throw primaryError;
      if (model === FALLBACK_MODEL) throw primaryError;
      console.warn("Mind map model failed, retrying with fallback:", FALLBACK_MODEL, primaryError);
      try {
        const fbModel = await createModelProvider(FALLBACK_MODEL);
        const result = await generateText({ model: fbModel, system, prompt, abortSignal: signal });
        return stripMarkdownFences(result.text);
      } catch (fallbackError) {
        console.error("Mind map fallback also failed:", fallbackError);
        throw primaryError;
      }
    }
  }

  async function readingTextGenerateText(prompt: string, system: string, signal?: AbortSignal): Promise<string> {
    const { readingTextModel: model } = useSettingStore.getState();
    const FALLBACK_MODEL = await getFallbackModel();
    try {
      const aiModel = await createModelProvider(model);
      const result = await generateText({ model: aiModel, system, prompt, abortSignal: signal });
      return stripMarkdownFences(result.text);
    } catch (primaryError) {
      if (signal?.aborted || isAbortError(primaryError)) throw primaryError;
      if (model === FALLBACK_MODEL) throw primaryError;
      console.warn("Reading-text model failed, retrying with fallback:", FALLBACK_MODEL, primaryError);
      try {
        const fbModel = await createModelProvider(FALLBACK_MODEL);
        const result = await generateText({ model: fbModel, system, prompt, abortSignal: signal });
        return stripMarkdownFences(result.text);
      } catch (fallbackError) {
        console.error("Reading-text fallback also failed:", fallbackError);
        throw primaryError;
      }
    }
  }

  async function extractTextFromImage(imageData: string) {
    if (useReadingStore.getState().activeGenerations["extracting"]) return "";
    const isSameSession = createSessionGuard();
    const ac = getAbortController("extracting");
    const { setExtractedText, setError, addOriginalImage } = readingStore;
    setGenerating("extracting", true);
    addOriginalImage(imageData);
    const toastId = toast.info(i18next.t("reading.imageUpload.extractingWait"), { duration: Infinity });

    try {
      const visionModel = await createModelProvider(visionModelName);
      
      const result = streamText({
        model: visionModel,
        system: getSystemPrompt(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: extractTextFromImagePrompt(),
              },
              {
                type: "image",
                image: imageData,
              },
            ],
          },
        ],
        experimental_transform: smoothTextStream(smoothTextStreamType),
        abortSignal: ac.signal,
        onError: (error) => {
          if (!isSameSession() || ac.signal.aborted) return;
          const msg = handleError(error);
          setError(msg);
          setGenerating("extracting", false);
        },
      });

      const currentText = useReadingStore.getState().extractedText || "";
      let text = currentText;
      if (text) {
        text += "\n\n";
      }
      setStreamingFlag(true);
      try {
        for await (const textPart of result.textStream) {
          if (!isSameSession() || ac.signal.aborted) break;
          text += textPart;
          setExtractedText(text);
        }
      } finally {
        setStreamingFlag(false);
      }

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("extracting", false);
        return "";
      }

      setExtractedText(text);

      const { id } = useReadingStore.getState();
      if (id) {
        markLastOpenedSession(id);
      }

      setGenerating("extracting", false);
      return text;
    } catch (error) {
      setStreamingFlag(false);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("extracting", false);
        return "";
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("extracting", false);
      return "";
    } finally {
      removeAbortController("extracting");
      toast.dismiss(toastId);
    }
  }

  async function generateTitle() {
    if (useReadingStore.getState().activeGenerations["title"]) return "";
    const isSameSession = createSessionGuard();
    const ac = getAbortController("title");
    const { extractedText, setDocTitle } = useReadingStore.getState();
    
    if (!extractedText) return "";

    setGenerating("title", true);

    try {
      const titleModel = await createModelProvider(summaryModel);
      const titleText = extractedText.slice(0, 2000);

      // First, try to extract the ACTUAL title from the text (not a generated
      // descriptive title). Exam labels like "Part A" / "Text 1" are explicitly
      // excluded — see extractTitleFromTextPrompt.
      try {
        const { text: rawTitle } = await generateText({
          model: titleModel,
          prompt: extractTitleFromTextPrompt(titleText),
          abortSignal: ac.signal,
        });
        if (!isSameSession() || ac.signal.aborted) {
          notifyGenerationCancelled();
          setGenerating("title", false);
          return "";
        }
        const realTitle = rawTitle.trim().replace(/^["'“”‘’]|["'“”‘’]$/g, "");
        if (realTitle) {
          setDocTitle(realTitle);
          setGenerating("title", false);
          return realTitle;
        }
      } catch (titleError) {
        if (ac.signal.aborted || isAbortError(titleError)) throw titleError;
      }

      // Fall back to generating a concise descriptive title only if no real
      // title could be extracted from the text.
      const { text: llmTitle } = await generateText({
        model: titleModel,
        prompt: `You are a helpful assistant. Read the following text and reply with ONLY a concise, descriptive title for it (5–10 words, no punctuation at the end, no quotation marks).\n\n${titleText}`,
        abortSignal: ac.signal,
      });
      
      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("title", false);
        return "";
      }

      const cleaned = llmTitle.trim().replace(/^["'""'']|["'""'']$/g, "");
      if (cleaned) {
        setDocTitle(cleaned);
      } else {
        const fallbackTitle = extractedText.split(/\n/).find((l) => l.trim()) ?? "";
        if (fallbackTitle) setDocTitle(fallbackTitle.slice(0, 80));
      }

      setGenerating("title", false);
      return cleaned;
    } catch {
      if (!isSameSession()) {
        setGenerating("title", false);
        return "";
      }
      const fallbackTitle = extractedText.split(/\n/).find((l) => l.trim()) ?? "";
      if (fallbackTitle) setDocTitle(fallbackTitle.slice(0, 80));
      setGenerating("title", false);
      return fallbackTitle.slice(0, 80);
    } finally {
      removeAbortController("title");
    }
  }

  async function generateSummary(useChinese: boolean = false) {
    if (useReadingStore.getState().activeGenerations["summary"]) return "";
    const isSameSession = createSessionGuard();
    const ac = getAbortController("summary");
    const { studentAge, extractedText, summary, summaryLanguage, setSummary, setError } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return "";
    }

    setGenerating("summary", true);
    const toastId = toast.info(i18next.t("reading.summary.generatingWait"), { duration: Infinity });

    // "Regenerate" while SWITCHING languages is a TRANSLATION of the existing
    // summary (same structure, new language); regenerating in the SAME
    // language must produce a fresh summary from the text. A NULL language
    // (legacy sessions) is unknown and falls back to fresh generation.
    const targetLanguage: "en" | "zh" = useChinese ? "zh" : "en";
    const isLanguageSwitch =
      !!summary && summaryLanguage !== null && summaryLanguage !== targetLanguage;

    try {
      const thinkingModel = await createModelProvider(summaryModel);

      const result = streamText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: isLanguageSwitch
          ? translateSummaryPrompt(summary, useChinese)
          : generateSummaryPrompt(studentAge, extractedText, useChinese),
        experimental_transform: smoothTextStream(smoothTextStreamType),
        abortSignal: ac.signal,
        onError: (error) => {
          if (!isSameSession() || ac.signal.aborted) return;
          const msg = handleError(error);
          setError(msg);
          setGenerating("summary", false);
        },
      });

      let text = "";
      setStreamingFlag(true);
      try {
        for await (const textPart of result.textStream) {
          if (!isSameSession() || ac.signal.aborted) break;
          text += textPart;
          setSummary(text, targetLanguage);
        }
      } finally {
        setStreamingFlag(false);
      }

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("summary", false);
        return "";
      }

      setSummary(text, targetLanguage);

      setGenerating("summary", false);
      return text;
    } catch (error) {
      setStreamingFlag(false);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("summary", false);
        return "";
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("summary", false);
      return "";
    } finally {
      removeAbortController("summary");
      toast.dismiss(toastId);
    }
  }

  async function generatePreReading(): Promise<PreReadingData | null> {
    if (useReadingStore.getState().activeGenerations["pre-reading"]) return null;
    const isSameSession = createSessionGuard();
    const ac = getAbortController("pre-reading");
    const { studentAge, extractedText, docTitle, setPreReading, setError } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return null;
    }

    setGenerating("pre-reading", true);
    const toastId = toast.info(i18next.t("reading.preReading.generatingWait"), { duration: Infinity });

    try {
      const text = await glossaryGenerateText(
        generatePreReadingPrompt(studentAge, extractedText, docTitle || undefined),
        getSystemPrompt(),
        prereadingModel,
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        setGenerating("pre-reading", false);
        return null;
      }

      const parsed = z
        .object({
          activationPrompts: z.array(z.string()),
          activationPromptZh: z.array(z.string()).optional(),
          predictionPrompt: z.string(),
          purpose: z.string(),
          purposeZh: z.string().optional(),
          preTeachWords: z.array(
            z.object({
              word: z.string(),
              syllabification: z.string().optional(),
              partOfSpeech: z.string(),
              englishDefinition: z.string(),
              chineseDefinition: z.string(),
            }),
          ),
          backgroundNote: z.string(),
          backgroundNoteZh: z.string().optional(),
        })
        .safeParse(JSON.parse(text));

      if (!parsed.success) {
        throw new Error(i18next.t("reading.preReading.parseError"));
      }

      const data: PreReadingData = { ...parsed.data, generatedAt: Date.now() };
      setPreReading(data);

      logActivity("pre_reading_generate", { sessionId: readingStore.id || undefined });

      toast.dismiss(toastId);
      setGenerating("pre-reading", false);
      return data;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("pre-reading", false);
        return null;
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("pre-reading", false);
      return null;
    } finally {
      removeAbortController("pre-reading");
    }
  }

  async function adaptText() {
    if (useReadingStore.getState().activeGenerations["adapted-text"]) return "";
    const isSameSession = createSessionGuard();
    const ac = getAbortController("adapted-text");
    const { studentAge, extractedText, setAdaptedText, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return "";
    }

    setGenerating("adapted-text", true);
    const toastId = toast.info(i18next.t("reading.adaptedText.adaptingWait"), { duration: Infinity });

    try {
      const thinkingModel = await createModelProvider(adaptedTextModel);
      
      const result = streamText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: adaptTextPrompt(studentAge, extractedText),
        experimental_transform: smoothTextStream(smoothTextStreamType),
        abortSignal: ac.signal,
        onError: (error) => {
          if (!isSameSession() || ac.signal.aborted) return;
          const msg = handleError(error);
          setError(msg);
          setGenerating("adapted-text", false);
        },
      });

      let text = "";
      setStreamingFlag(true);
      try {
        for await (const textPart of result.textStream) {
          if (!isSameSession() || ac.signal.aborted) break;
          text += textPart;
          setAdaptedText(text);
        }
      } finally {
        setStreamingFlag(false);
      }

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("adapted-text", false);
        return "";
      }

      setAdaptedText(text);

      if (text.trim()) {
        logActivity("adapted_text_generate", { sessionId: readingStore.id || undefined });
      }

      setGenerating("adapted-text", false);
      return text;
    } catch (error) {
      setStreamingFlag(false);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("adapted-text", false);
        return "";
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("adapted-text", false);
      return "";
    } finally {
      removeAbortController("adapted-text");
      toast.dismiss(toastId);
    }
  }

  async function simplifyText() {
    if (useReadingStore.getState().activeGenerations["simplified-text"]) return "";
    const isSameSession = createSessionGuard();
    const ac = getAbortController("simplified-text");
    const { studentAge, adaptedText, simplifiedText, setSimplifiedText, setError } = readingStore;
    
    const textToSimplify = simplifiedText || adaptedText;
    
    if (!textToSimplify) {
      toast.error("Please adapt the text first.");
      return "";
    }

    setGenerating("simplified-text", true);
    const toastId = toast.info(i18next.t("reading.adaptedText.simplifyingWait"), { duration: Infinity });

    try {
      const thinkingModel = await createModelProvider(simplifyModel);
      
      const result = streamText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: simplifyTextPrompt(studentAge, textToSimplify),
        experimental_transform: smoothTextStream(smoothTextStreamType),
        abortSignal: ac.signal,
        onError: (error) => {
          if (!isSameSession() || ac.signal.aborted) return;
          const msg = handleError(error);
          setError(msg);
          setGenerating("simplified-text", false);
        },
      });

      let text = "";
      setStreamingFlag(true);
      try {
        for await (const textPart of result.textStream) {
          if (!isSameSession() || ac.signal.aborted) break;
          text += textPart;
          setSimplifiedText(text);
        }
      } finally {
        setStreamingFlag(false);
      }

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("simplified-text", false);
        return "";
      }

      setSimplifiedText(text);

      if (text.trim()) {
        logActivity("simplified_text_generate", { sessionId: readingStore.id || undefined });
      }

      setGenerating("simplified-text", false);
      return text;
    } catch (error) {
      setStreamingFlag(false);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("simplified-text", false);
        return "";
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("simplified-text", false);
      return "";
    } finally {
      removeAbortController("simplified-text");
      toast.dismiss(toastId);
    }
  }

  async function generateMindMap(useChinese: boolean = false) {
    if (useReadingStore.getState().activeGenerations["mindmap"]) return "";
    const isSameSession = createSessionGuard();
    const ac = getAbortController("mindmap");
    const { studentAge, extractedText, mindMap, mindMapLanguage, setMindMap, setError } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return "";
    }

    setGenerating("mindmap", true);
    const toastId = toast.info(i18next.t("reading.mindMap.generatingWait"), { duration: Infinity });

    // "Regenerate" while SWITCHING languages is a TRANSLATION of the existing
    // map (same structure, new language); regenerating in the SAME language
    // must re-analyze the text and compose a fresh map. Legacy Mermaid-markdown
    // maps can't be parsed into MindMapData, and a NULL language (legacy
    // sessions) is unknown — both fall through to the full generation prompt.
    const existingMindMap = mindMap ? tryParseMindMapData(mindMap) : null;
    const targetLanguage: "en" | "zh" = useChinese ? "zh" : "en";
    const isLanguageSwitch =
      !!existingMindMap &&
      mindMapLanguage !== null &&
      mindMapLanguage !== targetLanguage;

    try {
      const text = await mindMapGenerateText(
        isLanguageSwitch
          ? translateMindMapPrompt(existingMindMap, useChinese)
          : generateMindMapPrompt(studentAge, extractedText, useChinese),
        getSystemPrompt(),
        mindMapModel,
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        setGenerating("mindmap", false);
        return "";
      }

      const data = mindMapDataSchema.parse(JSON.parse(text));
      const json = JSON.stringify(data);
      setMindMap(json, targetLanguage);

      logActivity("mindmap_generate", { sessionId: readingStore.id || undefined });

      toast.dismiss(toastId);
      setGenerating("mindmap", false);
      return json;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("mindmap", false);
        return "";
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("mindmap", false);
      return "";
    } finally {
      removeAbortController("mindmap");
    }
  }

  async function generateVisualization(useChinese: boolean = false): Promise<number | null> {
    if (useReadingStore.getState().activeGenerations["visualization"]) return null;
    const isSameSession = createSessionGuard();
    const ac = getAbortController("visualization");
    const {
      studentAge,
      extractedText,
      visualizationImage,
      visualizationLanguage,
      setVisualizationImage,
      setError,
    } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return null;
    }

    const { mode, accessPassword, provider, openAIApiKey, openaicompatibleApiKey } = useSettingStore.getState();

    if (mode === "local") {
      const hasKey =
        (provider === "openai" && openAIApiKey.length > 0) ||
        (provider === "openaicompatible" && openaicompatibleApiKey.length > 0);
      if (!hasKey) {
        toast.error("Please configure your API key in settings first.");
        return null;
      }
    }

    const toastId = toast.info(i18next.t("reading.visualization.generatingWait"), { duration: Infinity });

    setGenerating("visualization", true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (mode === "proxy") {
        headers["x-access-signature"] = generateSignature(accessPassword, Date.now());
      }

      const targetLanguage: "en" | "zh" = useChinese ? "zh" : "en";
      // Only send the existing image when the user is SWITCHING languages —
      // the server then performs an image-to-image TRANSLATION edit (same
      // composition, new language). Regenerating in the SAME language must
      // compose a fresh interpretation of the text, so the image is omitted.
      // A NULL language (legacy sessions, or a restored session whose full
      // media hasn't been lazy-loaded via loadFull) also falls back to fresh
      // generation.
      const isLanguageSwitch =
        !!visualizationImage &&
        visualizationLanguage !== null &&
        visualizationLanguage !== targetLanguage;

      const response = await fetch("/api/ai/visualization", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: extractedText,
          studentAge,
          useChinese,
          mode,
          ...(isLanguageSwitch ? { image: visualizationImage } : {}),
        }),
        signal: ac.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        const err = errorData.error;
        const errorMsg =
          typeof err === "string"
            ? err
            : err && typeof err === "object" && "status" in err && "message" in err
              ? `[${err.status}]: ${err.message}`
              : `Request failed (${response.status})`;
        toast.dismiss(toastId);
        toast.error(errorMsg);
        setError(errorMsg);
        setGenerating("visualization", false);
        return null;
      }

      const data = await response.json();
      if (!data.image) {
        throw new Error("No image in response");
      }

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("visualization", false);
        return null;
      }

      setVisualizationImage(data.image, targetLanguage);

      logActivity("visualization_generate", { sessionId: readingStore.id || undefined });

      toast.dismiss(toastId);
      setGenerating("visualization", false);
      return typeof data.remaining === "number" ? data.remaining : null;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("visualization", false);
        return null;
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("visualization", false);
      return null;
    } finally {
      removeAbortController("visualization");
    }
  }

  async function generateReadingTest(questionCounts: ReadingTestQuestionCounts) {
    if (useReadingStore.getState().activeGenerations["reading-test"]) return [];
    const isSameSession = createSessionGuard();
    const ac = getAbortController("reading-test");
    const { studentAge, extractedText, setReadingTest, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    const toastId = toast.info(i18next.t("reading.readingTest.generatingWait"), { duration: Infinity });

    setGenerating("reading-test", true);

    try {
      const text = await readingTestGenerateText(
        generateReadingTestPrompt(extractedText, studentAge, questionCounts),
        getSystemPrompt(),
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        setGenerating("reading-test", false);
        return [];
      }

      const questions: ReadingTestQuestion[] = JSON.parse(text);
      const sorted = sortQuestionsByParagraph(questions);
      setReadingTest(sorted);

      toast.dismiss(toastId);
      setGenerating("reading-test", false);
      return sorted;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("reading-test", false);
        return [];
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("reading-test", false);
      return [];
    } finally {
      removeAbortController("reading-test");
    }
  }

  async function generateGlossary() {
    if (useReadingStore.getState().activeGenerations["glossary"]) return [];
    const isSameSession = createSessionGuard();
    const ac = getAbortController("glossary");
    const { extractedText, highlightedWords, setGlossary, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    if (highlightedWords.length === 0) {
      toast.error("Please highlight some words first.");
      return [];
    }

    setGenerating("glossary", true);

    const toastId = toast.info(i18next.t("reading.glossary.generatingWait"), { duration: Infinity });

    try {
      const text = await glossaryGenerateText(
        generateGlossaryPrompt(extractedText, highlightedWords),
        getSystemPrompt(),
        glossaryModel,
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        setGenerating("glossary", false);
        return [];
      }

      const entries: GlossaryEntry[] = JSON.parse(text);
      setGlossary(entries);

      // Log for achievements — count of vocabulary items added
      logActivity("glossary_add", {
        sessionId: readingStore.id || undefined,
        details: { wordCount: entries.length },
      });

      toast.dismiss(toastId);
      setGenerating("glossary", false);
      return entries;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("glossary", false);
        return [];
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("glossary", false);
      return [];
    } finally {
      removeAbortController("glossary");
    }
  }

  async function suggestVocabulary(count: number) {
    if (useReadingStore.getState().activeGenerations["vocabulary-suggest"]) return [];
    const isSameSession = createSessionGuard();
    const ac = getAbortController("vocabulary-suggest");
    const { extractedText, studentAge, highlightedWords, setHighlightedWords } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    setGenerating("vocabulary-suggest", true);
    const toastId = toast.info(i18next.t("reading.adaptedText.suggesting"), { duration: Infinity });

    try {
      const text = await glossaryGenerateText(
        suggestVocabularyPrompt(studentAge, extractedText, count),
        getSystemPrompt(),
        suggestVocabModel,
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        setGenerating("vocabulary-suggest", false);
        return [];
      }

      const parsed = z
        .array(z.string())
        .transform((arr) => arr.map((s) => s.trim()).filter((s) => s.length > 0))
        .safeParse(JSON.parse(text));

      if (!parsed.success) {
        throw new Error(i18next.t("reading.adaptedText.suggestParseError"));
      }

      const existing = new Set(highlightedWords.map((w) => w.toLowerCase().trim()));
      const newWords: string[] = [];
      for (const word of parsed.data) {
        const normalized = word.toLowerCase().trim();
        if (normalized && !existing.has(normalized)) {
          existing.add(normalized);
          newWords.push(word);
        }
      }

      if (newWords.length > 0) {
        setHighlightedWords([...highlightedWords, ...newWords]);
      }

      toast.dismiss(toastId);
      toast.success(
        i18next.t("reading.adaptedText.suggestSuccess", {
          added: newWords.length,
          total: highlightedWords.length + newWords.length,
        }),
      );
      setGenerating("vocabulary-suggest", false);
      return newWords;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("vocabulary-suggest", false);
        return [];
      }
      handleError(error);
      setGenerating("vocabulary-suggest", false);
      return [];
    } finally {
      removeAbortController("vocabulary-suggest");
    }
  }

  async function generateCollocations(): Promise<CollocationChunk[] | null> {
    if (useReadingStore.getState().activeGenerations["collocations"]) return null;
    const isSameSession = createSessionGuard();
    const ac = getAbortController("collocations");
    const { studentAge, extractedText, glossary, setCollocations, setError } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return null;
    }

    setGenerating("collocations", true);
    const toastId = toast.info(i18next.t("reading.collocations.generatingWait"), { duration: Infinity });

    try {
      const text = await glossaryGenerateText(
        generateCollocationsPrompt(studentAge, extractedText, glossary.map((g) => g.word)),
        getSystemPrompt(),
        collocationModel,
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        setGenerating("collocations", false);
        return null;
      }

      const parsed = z
        .array(
          z.object({
            chunk: z.string(),
            syllabification: z.string().optional(),
            pattern: z.string(),
            meaning: z.string(),
            meaningZh: z.string(),
            contrastNote: z.string().optional(),
            example: z.string(),
          }),
        )
        .safeParse(JSON.parse(text));

      if (!parsed.success) {
        throw new Error(i18next.t("reading.collocations.parseError"));
      }

      const chunks: CollocationChunk[] = parsed.data.map((c, i) => ({
        id: `chunk-${Date.now()}-${i}`,
        chunk: c.chunk,
        syllabification: c.syllabification,
        pattern: c.pattern,
        meaning: c.meaning,
        meaningZh: c.meaningZh,
        contrastNote: c.contrastNote,
        example: c.example,
      }));

      setCollocations(chunks);
      logActivity("collocations_generate", { sessionId: readingStore.id || undefined });

      toast.dismiss(toastId);
      setGenerating("collocations", false);
      return chunks;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("collocations", false);
        return null;
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("collocations", false);
      return null;
    } finally {
      removeAbortController("collocations");
    }
  }

  function calculateTestScore() {
    const { setTestScore, setTestCompleted, setTestPoints, setSkillBreakdown } = readingStore;
    const { readingTest, id } = useReadingStore.getState();
    
    let earnedPoints = 0;
    let totalPoints = 0;
    
    for (const question of readingTest) {
      totalPoints += question.points;
      
      if (question.type === "short-answer") {
        if (question.earnedPoints !== undefined) {
          earnedPoints += question.earnedPoints;
        }
        continue;
      }
      
      const userAnswer = question.userAnswer?.toLowerCase().trim().replace(/[-\s]+/g, "-");
      const correctAnswer = question.correctAnswer.toLowerCase().trim().replace(/[-\s]+/g, "-");
      
      if (question.type === "multiple-choice" || 
          question.type === "inference" || 
          question.type === "vocab-context" || 
          question.type === "referencing") {
        if (userAnswer === correctAnswer || userAnswer === correctAnswer.charAt(0)) {
          earnedPoints += question.points;
        }
      } else if (question.type === "true-false-not-given") {
        if (userAnswer === correctAnswer) {
          earnedPoints += question.points;
        }
      }
    }
    
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    setTestScore(score);
    setTestCompleted(true);
    setTestPoints(earnedPoints, totalPoints);

    // Persist the per-skill breakdown (session field) and recompute the
    // cross-session diagnostic profile. Non-blocking — must not hold up the UI.
    const breakdown = computeSkillBreakdown(readingTest);
    setSkillBreakdown(breakdown);
    void fetch("/api/skill-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id || undefined, breakdown }),
    }).catch(() => {
      // Silent — profile recompute is best-effort; the session field is the
      // source of truth and will be aggregated on the next completion.
    });
    
    return score;
  }

  async function evaluateShortAnswer(
    questionId: string,
    question: string,
    correctAnswer: string,
    userAnswer: string,
    maxPoints: number
  ) {
    const isSameSession = createSessionGuard();
    const { setQuestionEarnedPoints } = readingStore;
    
    if (!userAnswer.trim()) {
      setQuestionEarnedPoints(questionId, 0);
      return { earnedPoints: 0, feedback: "No answer provided." };
    }
    
    try {
      const text = await readingTestGenerateText(
        `Evaluate this short-answer question response for a Hong Kong student learning English.

Question: ${question}

Expected key points: ${correctAnswer}

Student's answer: ${userAnswer}

Maximum points: ${maxPoints}

Evaluate how well the student's answer addresses the expected key points.
Respond with ONLY a JSON object (no markdown, no code blocks):
{
  "earnedPoints": <number 0 to ${maxPoints}>,
  "feedback": "<brief feedback in English explaining what was good and what was missing>"
}

Guidelines:
- Award partial points if some key points are mentioned
- Award 0 if answer is completely wrong or irrelevant
- Award full points if all key points are covered
- Keep feedback brief and encouraging`,
        getSystemPrompt(),
      );

      if (!isSameSession()) return { earnedPoints: 0, feedback: "Session changed." };

      const evaluation = JSON.parse(text);
      const earnedPoints = Math.min(Math.max(0, evaluation.earnedPoints), maxPoints);
      
      setQuestionEarnedPoints(questionId, earnedPoints);
      
      return { earnedPoints, feedback: evaluation.feedback };
    } catch (error) {
      console.error("Error evaluating short answer:", error);
      if (!isSameSession()) return { earnedPoints: 0, feedback: "Session changed." };
      setQuestionEarnedPoints(questionId, 0);
      return { earnedPoints: 0, feedback: "Could not evaluate answer." };
    }
  }

  async function generateTargetedPractice(missedSkills: ReadingTestSkill[]) {
    if (useReadingStore.getState().activeGenerations["targeted-practice"]) return [];
    const isSameSession = createSessionGuard();
    const ac = getAbortController("targeted-practice");
    const { studentAge, extractedText, setReadingTest, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    if (missedSkills.length === 0) {
      toast.error("No missed skills to practice.");
      return [];
    }

    setGenerating("targeted-practice", true);

    const toastId = toast.info(i18next.t("reading.readingTest.practiceGeneratingWait"), { duration: Infinity });

    try {
      const text = await readingTestGenerateText(
        generateTargetedPracticePrompt(extractedText, studentAge, missedSkills),
        getSystemPrompt(),
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        setGenerating("targeted-practice", false);
        return [];
      }

      const questions: ReadingTestQuestion[] = JSON.parse(text);
      const sorted = sortQuestionsByParagraph(questions);
      setReadingTest(sorted);

      // Log for achievements
      logActivity("targeted_practice_complete", { sessionId: readingStore.id || undefined });

      toast.dismiss(toastId);
      setGenerating("targeted-practice", false);
      return sorted;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("targeted-practice", false);
        return [];
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("targeted-practice", false);
      return [];
    } finally {
      removeAbortController("targeted-practice");
    }
  }

  async function askTutor(
    question: string,
    history: ChatMessage[],
    selectedText?: string,
    images?: string[],
    onChunk?: (chunk: string) => void,
    useChinese: boolean = false
  ): Promise<string> {
    const isSameSession = createSessionGuard();
    const ac = getAbortController("tutor");
    const { studentAge, extractedText } = useReadingStore.getState();
    const { tutorModel, basicTutorModel } = useSettingStore.getState();
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return "";
    }

    const hasImages = images && images.length > 0;
    const modelToUse = hasImages ? tutorModel : basicTutorModel;
    const visionModel = await createModelProvider(modelToUse);

    const messages: any[] = history
      .slice(-20)
      .map((msg) => {
        const messageText = msg.promptContent || msg.content;
        const textContent = msg.selectedText 
          ? `${messageText}\n\n[Context: The student is asking about this text: "${msg.selectedText}"]`
          : messageText;
        
        if (msg.role === "user" && msg.images && msg.images.length > 0 && hasImages) {
          return {
            role: "user",
            content: [
              { type: "text", text: textContent },
              ...msg.images.map((img) => ({ type: "image", image: img }))
            ]
          };
        }
        return { role: msg.role, content: textContent };
      });

    if (hasImages) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: selectedText 
            ? `${question}\n\n[Context: The student is asking about this text: "${selectedText}"]`
            : question 
          },
          ...images.map((img) => ({ type: "image", image: img }))
        ]
      });
    } else {
      const userContent = selectedText
        ? `${question}\n\n[Context: The student is asking about this text: "${selectedText}"]`
        : question;
      messages.push({ role: "user", content: userContent });
    }

    let fullResponse = "";

    setGenerating("tutor", true);
    try {
      const result = streamText({
        model: visionModel,
        system: readingTutorSystemPrompt(studentAge, extractedText, useChinese),
        messages,
        experimental_transform: smoothTextStream(smoothTextStreamType),
        abortSignal: ac.signal,
        onError: (error) => {
          if (!isSameSession() || ac.signal.aborted) return;
          handleError(error);
        },
      });

      for await (const textPart of result.textStream) {
        if (!isSameSession() || ac.signal.aborted) break;
        fullResponse += textPart;
        if (onChunk) {
          onChunk(fullResponse);
        }
      }

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("tutor", false);
        return "";
      }

      setGenerating("tutor", false);
      return fullResponse;
    } catch (error) {
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("tutor", false);
        return "";
      }
      handleError(error);
      setGenerating("tutor", false);
      return "";
    } finally {
      removeAbortController("tutor");
    }
  }

  async function analyzeGrammarTopics() {
    if (useReadingStore.getState().activeGenerations["grammar-topics"]) return [];
    const isSameSession = createSessionGuard();
    const ac = getAbortController("grammar-topics");
    const { studentAge, extractedText, setGrammarTopics, setError } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    setGenerating("grammar-topics", true);

    const toastId = toast.info(i18next.t("reading.grammar.analyzingWait"), { duration: Infinity });

    try {
      const text = await grammarGenerateText(
        analyzeGrammarTopicsPrompt(studentAge, extractedText),
        getSystemPrompt(),
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        setGenerating("grammar-topics", false);
        return [];
      }

      const topics: GrammarTopic[] = JSON.parse(text);
      setGrammarTopics(topics);
      readingStore.setGrammarQuiz([]);
      readingStore.setGrammarQuizCompleted(false);
      readingStore.setGrammarQuizScore(0);
      readingStore.setGrammarQuizPoints(0, 0);
      readingStore.setGrammarErrorChallenges([]);
      readingStore.setGrammarScrambleChallenges([]);
      readingStore.setGrammarWorkshopChallenges([]);
      readingStore.setGrammarGameQuestions([]);

      logActivity("grammar_analyze", { sessionId: readingStore.id || undefined });

      toast.dismiss(toastId);
      setGenerating("grammar-topics", false);
      return topics;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("grammar-topics", false);
        return [];
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("grammar-topics", false);
      return [];
    } finally {
      removeAbortController("grammar-topics");
    }
  }

  // Generates the on-demand "Full Lesson" enrichment for a single grammar topic.
  async function generateGrammarLesson(topicId: string) {
    const key = `grammar-lesson:${topicId}`;
    if (useReadingStore.getState().activeGenerations[key]) return;
    const isSameSession = createSessionGuard();
    const ac = getAbortController(key);
    const { studentAge, extractedText, grammarTopics } = readingStore;
    const topic = grammarTopics.find((t) => t.id === topicId);
    if (!topic || !extractedText) return;

    setGenerating(key, true);
    const toastId = toast.info(i18next.t("reading.grammar.lesson.generatingWait"), { duration: Infinity });
    try {
      const text = await grammarGenerateText(
        generateGrammarLessonPrompt(topic, extractedText, studentAge),
        getSystemPrompt(),
        ac.signal,
      );
      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        return;
      }
      const enrichment: GrammarLessonEnrichment = JSON.parse(text);
      readingStore.enrichGrammarTopic(topicId, enrichment);
      toast.dismiss(toastId);
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        return;
      }
      handleError(error);
    } finally {
      if (isSameSession()) setGenerating(key, false);
      removeAbortController(key);
    }
  }

  // Hybrid "Ask AI for help" — evaluates a single guided-practice item.
  async function evaluateGrammarPracticeItem(
    item: GrammarGuidedPracticeItem,
    userAnswer: string
  ): Promise<{ correct: boolean; feedback: string }> {
    const isSameSession = createSessionGuard();
    try {
      const text = await grammarGenerateText(
        evaluateGrammarPracticePrompt(item, userAnswer),
        getSystemPrompt(),
      );
      if (!isSameSession()) return { correct: false, feedback: "Session changed." };
      const result = JSON.parse(text);
      return {
        correct: !!result.correct,
        feedback: result.feedback || "",
      };
    } catch (error) {
      console.error("Error evaluating grammar practice item:", error);
      return { correct: false, feedback: i18next.t("reading.grammar.lesson.practiceAiError") };
    }
  }

  async function generateGrammarQuiz() {
    if (useReadingStore.getState().activeGenerations["grammar-quiz"]) return [];
    const isSameSession = createSessionGuard();
    const ac = getAbortController("grammar-quiz");
    const { studentAge, extractedText, grammarTopics, setGrammarQuiz, setError } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    if (grammarTopics.length === 0) {
      toast.error("Please analyze grammar topics first.");
      return [];
    }

    setGenerating("grammar-quiz", true);

    const toastId = toast.info(i18next.t("reading.grammar.quiz.generatingWait"), { duration: Infinity });

    try {
      const text = await grammarGenerateText(
        generateGrammarQuizPrompt(extractedText, studentAge, grammarTopics),
        getSystemPrompt(),
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        setGenerating("grammar-quiz", false);
        return [];
      }

      const raw: GrammarQuizQuestion[] = JSON.parse(text);
      const questions = raw.map((q) => {
        if (!q.options || q.type === "fill-in" || q.type === "rewrite") return q;
        const correctIdx = q.correctAnswer.toUpperCase().charCodeAt(0) - 65;
        const indices = q.options.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const stripPrefix = (s: string) => s.replace(/^[A-D]\)\s*/, "");
        const newOptions = indices.map((idx, pos) => `${String.fromCharCode(65 + pos)}) ${stripPrefix(q.options![idx])}`);
        const newOptionsZh = q.optionsZh ? indices.map((idx, pos) => `${String.fromCharCode(65 + pos)}) ${stripPrefix(q.optionsZh![idx])}`) : undefined;
        const newCorrectAnswer = String.fromCharCode(65 + indices.indexOf(correctIdx));
        return { ...q, options: newOptions, optionsZh: newOptionsZh, correctAnswer: newCorrectAnswer };
      });
      setGrammarQuiz(questions);

      toast.dismiss(toastId);
      setGenerating("grammar-quiz", false);
      return questions;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("grammar-quiz", false);
        return [];
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("grammar-quiz", false);
      return [];
    } finally {
      removeAbortController("grammar-quiz");
    }
  }

  function calculateGrammarQuizScore() {
    const { setGrammarQuizScore, setGrammarQuizCompleted, setGrammarQuizPoints } = readingStore;
    const { grammarQuiz } = useReadingStore.getState();

    let earnedPoints = 0;
    let totalPoints = 0;

    for (const question of grammarQuiz) {
      totalPoints += question.points;

      if (question.type === "rewrite" || question.type === "fill-in") {
        if (question.earnedPoints !== undefined) {
          earnedPoints += question.earnedPoints;
        }
        continue;
      }

      const userAnswer = question.userAnswer?.toLowerCase().trim();
      const correctAnswer = question.correctAnswer.toLowerCase().trim();

      if (userAnswer === correctAnswer || userAnswer === correctAnswer.charAt(0)) {
        earnedPoints += question.points;
      }
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    setGrammarQuizScore(score);
    setGrammarQuizCompleted(true);
    setGrammarQuizPoints(earnedPoints, totalPoints);

    logActivity("grammar_quiz_complete", {
      sessionId: useReadingStore.getState().id || undefined,
      score,
    });

    return score;
  }

  async function evaluateGrammarOpenAnswer(
    questionId: string,
    question: string,
    correctAnswer: string,
    userAnswer: string,
    maxPoints: number
  ) {
    const isSameSession = createSessionGuard();
    const { setGrammarQuizQuestionPoints } = readingStore;

    if (!userAnswer.trim()) {
      setGrammarQuizQuestionPoints(questionId, 0);
      return { earnedPoints: 0, feedback: "No answer provided." };
    }

    try {
      const text = await grammarGenerateText(
        evaluateGrammarRewritePrompt(question, correctAnswer, userAnswer, maxPoints),
        getSystemPrompt(),
      );

      if (!isSameSession()) return { earnedPoints: 0, feedback: "Session changed." };

      const evaluation = JSON.parse(text);
      const earnedPoints = Math.min(Math.max(0, evaluation.earnedPoints), maxPoints);

      setGrammarQuizQuestionPoints(questionId, earnedPoints);

      return { earnedPoints, feedback: evaluation.feedback };
    } catch (error) {
      console.error("Error evaluating grammar answer:", error);
      if (!isSameSession()) return { earnedPoints: 0, feedback: "Session changed." };
      setGrammarQuizQuestionPoints(questionId, 0);
      return { earnedPoints: 0, feedback: "Could not evaluate answer." };
    }
  }

  // ── Grammar Games AI helpers ───────────────────────────────────────────────

  /** Generates (or refreshes) Error Surgery challenges using grammarTopics. */
  async function generateErrorSurgeryContent(): Promise<ErrorSurgeryChallenge[]> {
    if (useReadingStore.getState().activeGenerations["grammar-surgery"]) return [];
    const isSameSession = createSessionGuard();
    const ac = getAbortController("grammar-surgery");
    const { grammarTopics, studentAge, setGrammarErrorChallenges } = readingStore;

    if (grammarTopics.length === 0) return [];

    setGenerating("grammar-surgery", true);
    try {
      const text = await grammarGenerateText(
        generateErrorSurgeryPrompt(grammarTopics, studentAge),
        getSystemPrompt(),
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("grammar-surgery", false);
        return [];
      }

      const challenges: ErrorSurgeryChallenge[] = JSON.parse(text);
      setGrammarErrorChallenges(challenges);
      setGenerating("grammar-surgery", false);
      return challenges;
    } catch (error) {
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("grammar-surgery", false);
        return [];
      }
      handleError(error);
      setGenerating("grammar-surgery", false);
      return [];
    } finally {
      removeAbortController("grammar-surgery");
    }
  }

  /** Generates (or refreshes) Word Order Scramble challenges, persisted to store. */
  async function generateGrammarScrambleContent(): Promise<GrammarScrambleChallenge[]> {
    if (useReadingStore.getState().activeGenerations["grammar-scramble"]) return [];
    const isSameSession = createSessionGuard();
    const ac = getAbortController("grammar-scramble");
    const { grammarTopics, studentAge, setGrammarScrambleChallenges } = readingStore;

    if (grammarTopics.length === 0) return [];

    setGenerating("grammar-scramble", true);
    try {
      const text = await grammarGenerateText(
        generateGrammarScramblePrompt(grammarTopics, studentAge),
        getSystemPrompt(),
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("grammar-scramble", false);
        return [];
      }

      const challenges = JSON.parse(text) as GrammarScrambleChallenge[];
      setGrammarScrambleChallenges(challenges);
      setGenerating("grammar-scramble", false);
      return challenges;
    } catch (error) {
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("grammar-scramble", false);
        return [];
      }
      handleError(error);
      setGenerating("grammar-scramble", false);
      return [];
    } finally {
      removeAbortController("grammar-scramble");
    }
  }

  /** Generates (or refreshes) Grammar Workshop slot-fill challenges, persisted to store. */
  async function generateGrammarWorkshopContent(): Promise<GrammarWorkshopChallenge[]> {
    if (useReadingStore.getState().activeGenerations["grammar-workshop"]) return [];
    const isSameSession = createSessionGuard();
    const ac = getAbortController("grammar-workshop");
    const { grammarTopics, studentAge, setGrammarWorkshopChallenges } = readingStore;

    if (grammarTopics.length === 0) return [];

    setGenerating("grammar-workshop", true);
    try {
      const text = await grammarGenerateText(
        generateGrammarWorkshopPrompt(grammarTopics, studentAge),
        getSystemPrompt(),
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("grammar-workshop", false);
        return [];
      }

      const raw = JSON.parse(text) as GrammarWorkshopChallenge[];
      const challenges = raw.map((c) => {
        const shuffled = [...c.wordBank];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return { ...c, wordBank: shuffled };
      });
      setGrammarWorkshopChallenges(challenges);
      setGenerating("grammar-workshop", false);
      return challenges;
    } catch (error) {
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("grammar-workshop", false);
        return [];
      }
      handleError(error);
      setGenerating("grammar-workshop", false);
      return [];
    } finally {
      removeAbortController("grammar-workshop");
    }
  }

  /** Generates (or refreshes) MCQ questions for Grammar Roulette + Duel, persisted to store. */
  async function generateGrammarQuestions(): Promise<GrammarGameQuestion[]> {
    if (useReadingStore.getState().activeGenerations["grammar-questions"]) return [];
    const isSameSession = createSessionGuard();
    const ac = getAbortController("grammar-questions");
    const { grammarTopics, studentAge, setGrammarGameQuestions } = readingStore;

    if (grammarTopics.length === 0) return [];

    setGenerating("grammar-questions", true);
    try {
      const text = await grammarGenerateText(
        generateGrammarQuestionsPrompt(grammarTopics, studentAge),
        getSystemPrompt(),
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        setGenerating("grammar-questions", false);
        return [];
      }

      const raw = JSON.parse(text) as GrammarGameQuestion[];
      const questions = raw.map((q) => {
        const correctOpt = q.options[q.correctIndex];
        const shuffled = [...q.options];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return { ...q, options: shuffled, correctIndex: shuffled.indexOf(correctOpt) };
      });
      setGrammarGameQuestions(questions);
      setGenerating("grammar-questions", false);
      return questions;
    } catch (error) {
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("grammar-questions", false);
        return [];
      }
      handleError(error);
      setGenerating("grammar-questions", false);
      return [];
    } finally {
      removeAbortController("grammar-questions");
    }
  }

  function saveSession() {
    const { backup } = readingStore;
    const { save } = useHistoryStore.getState();
    const session = backup();
    return save(session);
  }

  // Zod schema for parsing the AI-generated reading-text JSON. Uses safeParse
  // (per the suggestVocabulary precedent) so a malformed model response surfaces
  // a clear error instead of an opaque JSON.parse failure.
  const generatedTextSchema = z.object({
    title: z.string().min(1),
    text_type: z.string(),
    cefr_level: z.string(),
    word_count: z.number(),
    estimated_fk_grade: z.number(),
    new_vocabulary: z.array(z.string()).catch([]),
    body: z.array(z.string().min(1)).min(1),
  });

  interface GenerateReadingTextParams {
    topic: string;
    description?: string;
    textTypeId: ReadingTextType;
    targetWordCount: number;
    cefrOverride?: CEFRLevel;
  }

  /**
   * Generates an age-appropriate, CEFR-banded reading text via the
   * readingTextModel. Parses the structured JSON response, then loads it into
   * the store via `loadGeneratedText` — which mints a fresh session, sets
   * `source: "ai-generated"`, and lights up the entire downstream pipeline
   * (summary, glossary, reading test, etc.) the same way Upload/Repository do.
   */
  async function generateReadingText(params: GenerateReadingTextParams) {
    if (useReadingStore.getState().activeGenerations["reading-text"]) return false;
    const isSameSession = createSessionGuard();
    const ac = getAbortController("reading-text");
    const { studentAge, loadGeneratedText, setError } = readingStore;

    const topic = params.topic.trim();
    if (!topic) {
      toast.error(i18next.t("reading.aiGenerate.topicRequired"));
      return false;
    }

    const textType = READING_TEXT_TYPES.find((tt) => tt.id === params.textTypeId);
    if (!textType) {
      toast.error(i18next.t("reading.aiGenerate.invalidTextType"));
      return false;
    }

    const cefrLevel = params.cefrOverride ?? getAgeLevelMapping(studentAge).cefr;
    const textTypeLabel = i18next.t(textType.labelKey);

    setGenerating("reading-text", true);
    const toastId = toast.info(i18next.t("reading.aiGenerate.generatingWait"), { duration: Infinity });

    try {
      const text = await readingTextGenerateText(
        generateReadingTextPrompt({
          age: studentAge,
          cefrLevel,
          topic,
          description: params.description,
          textTypeId: params.textTypeId,
          textTypeLabel,
          wordCount: params.targetWordCount,
        }),
        getSystemPrompt(),
        ac.signal,
      );

      if (!isSameSession() || ac.signal.aborted) {
        notifyGenerationCancelled();
        toast.dismiss(toastId);
        setGenerating("reading-text", false);
        return false;
      }

      const parsed = generatedTextSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        throw new Error(i18next.t("reading.aiGenerate.parseError"));
      }
      const gen = parsed.data as GeneratedReadingText;

      const meta: GeneratedTextMeta = {
        topic,
        description: params.description?.trim() || undefined,
        textType: params.textTypeId,
        textTypeLabel,
        targetWordCount: params.targetWordCount,
        cefrLevel,
        ageGeneratedFor: studentAge,
        generatedAt: Date.now(),
        actualWordCount: gen.word_count,
        estimatedFkGrade: gen.estimated_fk_grade,
        newVocabulary: gen.new_vocabulary ?? [],
      };

      loadGeneratedText(gen.title, gen.body, meta);

      logActivity("reading_text_generate", {
        details: {
          wordCount: gen.word_count,
          difficulty: cefrLevel,
        },
      });

      toast.dismiss(toastId);
      setGenerating("reading-text", false);
      return true;
    } catch (error) {
      toast.dismiss(toastId);
      if (!isSameSession() || isAbortError(error)) {
        notifyGenerationCancelled();
        setGenerating("reading-text", false);
        return false;
      }
      const msg = handleError(error);
      setError(msg);
      setGenerating("reading-text", false);
      return false;
    } finally {
      removeAbortController("reading-text");
    }
  }

  /**
   * Re-runs generation one CEFR band easier or harder than the last generation,
   * reusing the stored topic/text-type/length. Used by the "regenerate at
   * slightly higher/lower level" buttons — a single generation may not always
   * land at the intended difficulty on the first try.
   */
  async function regenerateReadingText(direction: "easier" | "harder") {
    const { generatedTextMeta } = readingStore;
    if (!generatedTextMeta) return false;
    const newLevel = shiftCefrLevel(generatedTextMeta.cefrLevel, direction);
    return generateReadingText({
      topic: generatedTextMeta.topic,
      description: generatedTextMeta.description,
      textTypeId: generatedTextMeta.textType as ReadingTextType,
      targetWordCount: generatedTextMeta.targetWordCount,
      cefrOverride: newLevel,
    });
  }

  async function loadSession(id: string) {
    const { load } = useHistoryStore.getState();
    const session = load(id);
    if (session) {
      await readingStore.restore(session);
      markLastOpenedSession(session.id);
      return true;
    }
    return false;
  }

  return {
    activeGenerations: readingStore.activeGenerations,
    extractTextFromImage,
    generateTitle,
    generateSummary,
    generatePreReading,
    adaptText,
    simplifyText,
    generateMindMap,
    generateVisualization,
    generateReadingTest,
    generateTargetedPractice,
    generateGlossary,
    suggestVocabulary,
    generateCollocations,
    analyzeGrammarTopics,
    generateGrammarLesson,
    evaluateGrammarPracticeItem,
    generateGrammarQuiz,
    calculateGrammarQuizScore,
    evaluateGrammarOpenAnswer,
    generateErrorSurgeryContent,
    generateGrammarScrambleContent,
    generateGrammarWorkshopContent,
    generateGrammarQuestions,
    calculateTestScore,
    evaluateShortAnswer,
    askTutor,
    generateReadingText,
    regenerateReadingText,
    saveSession,
    loadSession,
  };
}

export default useReadingAssistant;
