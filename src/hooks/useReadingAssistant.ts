import { useState } from "react";
import { streamText, smoothStream, generateText } from "ai";
import { toast } from "sonner";
import i18next from "i18next";
import { markLastOpenedSession, useSettingStore } from "@/store/setting";
import { useReadingStore, setStreamingFlag, type ReadingStatus } from "@/store/reading";
import { useHistoryStore } from "@/store/history";
import useModelProvider from "@/hooks/useAiProvider";
import {
  getSystemPrompt,
  extractTextFromImagePrompt,
  generateSummaryPrompt,
  adaptTextPrompt,
  simplifyTextPrompt,
  generateMindMapPrompt,
  generateReadingTestPrompt,
  generateTargetedPracticePrompt,
  generateGlossaryPrompt,
  readingTutorSystemPrompt,
  analyzeGrammarTopicsPrompt,
  generateGrammarQuizPrompt,
  evaluateGrammarRewritePrompt,
  generateGrammarScramblePrompt,
  generateGrammarWorkshopPrompt,
  generateErrorSurgeryPrompt,
  generateGrammarQuestionsPrompt,
} from "@/constants/readingPrompts";
import { parseError } from "@/utils/error";
import { logActivity } from "@/utils/activityLogger";

function smoothTextStream(type: "character" | "word" | "line") {
  return smoothStream({
    chunking: type === "character" ? /./ : type,
    delayInMs: 0,
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

let _fallbackModelPromise: Promise<string> | null = null;

function getFallbackModel(): Promise<string> {
  if (!_fallbackModelPromise) {
    _fallbackModelPromise = fetch("/api/config")
      .then((r) => r.json())
      .then((data) => data.fallbackModel || "gemini-3-flash-preview")
      .catch(() => "gemini-3-flash-preview");
  }
  return _fallbackModelPromise;
}

function useReadingAssistant() {
  const { 
    smoothTextStreamType, 
    visionModel: visionModelName,
    summaryModel,
    mindMapModel,
    adaptedTextModel,
    simplifyModel,
    glossaryModel,
  } = useSettingStore();
  const readingStore = useReadingStore();
  const { createModelProvider } = useModelProvider();
  const [status, setStatus] = useState<ReadingStatus>("idle");

  async function grammarGenerateText(prompt: string, system: string): Promise<string> {
    const { grammarModel: model } = useSettingStore.getState();
    const FALLBACK_MODEL = await getFallbackModel();
    try {
      const aiModel = await createModelProvider(model);
      const result = await generateText({ model: aiModel, system, prompt });
      return stripMarkdownFences(result.text);
    } catch (primaryError) {
      if (model === FALLBACK_MODEL) throw primaryError;
      console.warn("Grammar model failed, retrying with fallback:", FALLBACK_MODEL, primaryError);
      try {
        const fbModel = await createModelProvider(FALLBACK_MODEL);
        const result = await generateText({ model: fbModel, system, prompt });
        return stripMarkdownFences(result.text);
      } catch (fallbackError) {
        console.error("Grammar fallback also failed:", fallbackError);
        throw primaryError;
      }
    }
  }

  async function readingTestGenerateText(prompt: string, system: string): Promise<string> {
    const { readingTestModel: model } = useSettingStore.getState();
    const FALLBACK_MODEL = await getFallbackModel();
    try {
      const aiModel = await createModelProvider(model);
      const result = await generateText({ model: aiModel, system, prompt });
      return stripMarkdownFences(result.text);
    } catch (primaryError) {
      if (model === FALLBACK_MODEL) throw primaryError;
      console.warn("Reading test model failed, retrying with fallback:", FALLBACK_MODEL, primaryError);
      try {
        const fbModel = await createModelProvider(FALLBACK_MODEL);
        const result = await generateText({ model: fbModel, system, prompt });
        return stripMarkdownFences(result.text);
      } catch (fallbackError) {
        console.error("Reading test fallback also failed:", fallbackError);
        throw primaryError;
      }
    }
  }

  async function glossaryGenerateText(prompt: string, system: string, model: string): Promise<string> {
    const FALLBACK_MODEL = await getFallbackModel();
    try {
      const aiModel = await createModelProvider(model);
      const result = await generateText({ model: aiModel, system, prompt });
      return stripMarkdownFences(result.text);
    } catch (primaryError) {
      if (model === FALLBACK_MODEL) throw primaryError;
      console.warn("Glossary model failed, retrying with fallback:", FALLBACK_MODEL, primaryError);
      try {
        const fbModel = await createModelProvider(FALLBACK_MODEL);
        const result = await generateText({ model: fbModel, system, prompt });
        return stripMarkdownFences(result.text);
      } catch (fallbackError) {
        console.error("Glossary fallback also failed:", fallbackError);
        throw primaryError;
      }
    }
  }

  async function extractTextFromImage(imageData: string) {
    const { setStatus: setStoreStatus, setExtractedText, setError, addOriginalImage } = readingStore;
    setStoreStatus("extracting");
    setStatus("extracting");
    addOriginalImage(imageData);

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
        onError: (error) => {
          const msg = handleError(error);
          setError(msg);
          setStoreStatus("error");
          setStatus("idle");
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
          text += textPart;
          setExtractedText(text);
        }
      } finally {
        setStreamingFlag(false);
      }
      setExtractedText(text);

      const { id } = useReadingStore.getState();
      if (id) {
        markLastOpenedSession(id);
      }

      setStoreStatus("idle");
      setStatus("idle");
      return text;
    } catch (error) {
      setStreamingFlag(false);
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return "";
    }
  }

  async function generateTitle() {
    const { extractedText, setDocTitle, setStatus: setStoreStatus } = useReadingStore.getState();
    
    if (!extractedText) return "";

    setStoreStatus("summarizing");
    setStatus("summarizing");

    try {
      const titleModel = await createModelProvider(summaryModel);
      const titleText = extractedText.slice(0, 2000);
      
      const { text: llmTitle } = await generateText({
        model: titleModel,
        prompt: `You are a helpful assistant. Read the following text and reply with ONLY a concise, descriptive title for it (5–10 words, no punctuation at the end, no quotation marks).\n\n${titleText}`,
      });
      
      const cleaned = llmTitle.trim().replace(/^["'""'']|["'""'']$/g, "");
      if (cleaned) {
        setDocTitle(cleaned);
      } else {
        const fallbackTitle = extractedText.split(/\n/).find((l) => l.trim()) ?? "";
        if (fallbackTitle) setDocTitle(fallbackTitle.slice(0, 80));
      }

      setStoreStatus("idle");
      setStatus("idle");
      return cleaned;
    } catch {
      const fallbackTitle = extractedText.split(/\n/).find((l) => l.trim()) ?? "";
      if (fallbackTitle) setDocTitle(fallbackTitle.slice(0, 80));
      setStoreStatus("idle");
      setStatus("idle");
      return fallbackTitle.slice(0, 80);
    }
  }

  async function generateSummary() {
    const { studentAge, extractedText, setSummary, setStatus: setStoreStatus, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return "";
    }

    setStoreStatus("summarizing");
    setStatus("summarizing");

    try {
      const thinkingModel = await createModelProvider(summaryModel);
      
      const result = streamText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: generateSummaryPrompt(studentAge, extractedText),
        experimental_transform: smoothTextStream(smoothTextStreamType),
        onError: (error) => {
          const msg = handleError(error);
          setError(msg);
          setStoreStatus("error");
          setStatus("idle");
        },
      });

      let text = "";
      setStreamingFlag(true);
      try {
        for await (const textPart of result.textStream) {
          text += textPart;
          setSummary(text);
        }
      } finally {
        setStreamingFlag(false);
      }
      setSummary(text);

      setStoreStatus("idle");
      setStatus("idle");
      return text;
    } catch (error) {
      setStreamingFlag(false);
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return "";
    }
  }

  async function adaptText() {
    const { studentAge, extractedText, setAdaptedText, setStatus: setStoreStatus, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return "";
    }

    setStoreStatus("adapting");
    setStatus("adapting");

    try {
      const thinkingModel = await createModelProvider(adaptedTextModel);
      
      const result = streamText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: adaptTextPrompt(studentAge, extractedText),
        experimental_transform: smoothTextStream(smoothTextStreamType),
        onError: (error) => {
          const msg = handleError(error);
          setError(msg);
          setStoreStatus("error");
          setStatus("idle");
        },
      });

      let text = "";
      setStreamingFlag(true);
      try {
        for await (const textPart of result.textStream) {
          text += textPart;
          setAdaptedText(text);
        }
      } finally {
        setStreamingFlag(false);
      }
      setAdaptedText(text);

      // Log for achievements
      logActivity("adapted_text_generate", { sessionId: readingStore.id || undefined });

      setStoreStatus("idle");
      setStatus("idle");
      return text;
    } catch (error) {
      setStreamingFlag(false);
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return "";
    }
  }

  async function simplifyText() {
    const { studentAge, adaptedText, simplifiedText, setSimplifiedText, setStatus: setStoreStatus, setError } = readingStore;
    
    const textToSimplify = simplifiedText || adaptedText;
    
    if (!textToSimplify) {
      toast.error("Please adapt the text first.");
      return "";
    }

    setStoreStatus("simplifying");
    setStatus("simplifying");

    try {
      const thinkingModel = await createModelProvider(simplifyModel);
      
      const result = streamText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: simplifyTextPrompt(studentAge, textToSimplify),
        experimental_transform: smoothTextStream(smoothTextStreamType),
        onError: (error) => {
          const msg = handleError(error);
          setError(msg);
          setStoreStatus("error");
          setStatus("idle");
        },
      });

      let text = "";
      setStreamingFlag(true);
      try {
        for await (const textPart of result.textStream) {
          text += textPart;
          setSimplifiedText(text);
        }
      } finally {
        setStreamingFlag(false);
      }
      setSimplifiedText(text);

      // Log for achievements
      logActivity("simplified_text_generate", { sessionId: readingStore.id || undefined });

      setStoreStatus("idle");
      setStatus("idle");
      return text;
    } catch (error) {
      setStreamingFlag(false);
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return "";
    }
  }

  async function generateMindMap(useChinese: boolean = false) {
    const { studentAge, extractedText, setMindMap, setStatus: setStoreStatus, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return "";
    }

    setStoreStatus("mindmap");
    setStatus("mindmap");

    try {
      const thinkingModel = await createModelProvider(mindMapModel);
      
      const result = streamText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: generateMindMapPrompt(studentAge, extractedText, useChinese),
        experimental_transform: smoothTextStream(smoothTextStreamType),
        onError: (error) => {
          const msg = handleError(error);
          setError(msg);
          setStoreStatus("error");
          setStatus("idle");
        },
      });

      let text = "";
      setStreamingFlag(true);
      try {
        for await (const textPart of result.textStream) {
          text += textPart;
          setMindMap(text);
        }
      } finally {
        setStreamingFlag(false);
      }
      setMindMap(text);

      // Log for achievements
      logActivity("mindmap_generate", { sessionId: readingStore.id || undefined });

      setStoreStatus("idle");
      setStatus("idle");
      return text;
    } catch (error) {
      setStreamingFlag(false);
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return "";
    }
  }

  async function generateVisualization(useChinese: boolean = false): Promise<number | null> {
    const { studentAge, extractedText, setVisualizationImage, setStatus: setStoreStatus, setError } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return null;
    }

    setStoreStatus("visualization");
    setStatus("visualization");

    try {
      const response = await fetch("/api/ai/visualization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText, studentAge, useChinese, mode: useSettingStore.getState().mode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      if (!data.image) {
        throw new Error("No image in response");
      }

      setVisualizationImage(data.image);

      logActivity("visualization_generate", { sessionId: readingStore.id || undefined });

      setStoreStatus("idle");
      setStatus("idle");
      return typeof data.remaining === "number" ? data.remaining : null;
    } catch (error) {
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return null;
    }
  }

  async function generateReadingTest() {
    const { studentAge, extractedText, setReadingTest, setStatus: setStoreStatus, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    const toastId = toast.info(i18next.t("reading.readingTest.generatingWait"), { duration: Infinity });

    setStoreStatus("testing");
    setStatus("testing");

    try {
      const text = await readingTestGenerateText(
        generateReadingTestPrompt(extractedText, studentAge),
        getSystemPrompt(),
      );

      const questions: ReadingTestQuestion[] = JSON.parse(text);
      setReadingTest(questions);

      toast.dismiss(toastId);
      setStoreStatus("idle");
      setStatus("idle");
      return questions;
    } catch (error) {
      toast.dismiss(toastId);
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return [];
    }
  }

  async function generateGlossary() {
    const { extractedText, highlightedWords, setGlossary, setStatus: setStoreStatus, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    if (highlightedWords.length === 0) {
      toast.error("Please highlight some words first.");
      return [];
    }

    setStoreStatus("glossary");
    setStatus("glossary");

    const toastId = toast.info(i18next.t("reading.glossary.generatingWait"), { duration: Infinity });

    try {
      const text = await glossaryGenerateText(
        generateGlossaryPrompt(extractedText, highlightedWords),
        getSystemPrompt(),
        glossaryModel,
      );

      const entries: GlossaryEntry[] = JSON.parse(text);
      setGlossary(entries);

      // Log for achievements — count of vocabulary items added
      logActivity("glossary_add", {
        sessionId: readingStore.id || undefined,
        details: { wordCount: entries.length },
      });

      toast.dismiss(toastId);
      setStoreStatus("idle");
      setStatus("idle");
      return entries;
    } catch (error) {
      toast.dismiss(toastId);
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return [];
    }
  }

  function calculateTestScore() {
    const { setTestScore, setTestCompleted, setTestPoints } = readingStore;
    const { readingTest } = useReadingStore.getState();
    
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
    
    return score;
  }

  async function evaluateShortAnswer(
    questionId: string,
    question: string,
    correctAnswer: string,
    userAnswer: string,
    maxPoints: number
  ) {
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

      const evaluation = JSON.parse(text);
      const earnedPoints = Math.min(Math.max(0, evaluation.earnedPoints), maxPoints);
      
      setQuestionEarnedPoints(questionId, earnedPoints);
      
      return { earnedPoints, feedback: evaluation.feedback };
    } catch (error) {
      console.error("Error evaluating short answer:", error);
      setQuestionEarnedPoints(questionId, 0);
      return { earnedPoints: 0, feedback: "Could not evaluate answer." };
    }
  }

  async function generateTargetedPractice(missedSkills: ReadingTestSkill[]) {
    const { studentAge, extractedText, setReadingTest, setStatus: setStoreStatus, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    if (missedSkills.length === 0) {
      toast.error("No missed skills to practice.");
      return [];
    }

    setStoreStatus("testing");
    setStatus("testing");

    const toastId = toast.info(i18next.t("reading.readingTest.practiceGeneratingWait"), { duration: Infinity });

    try {
      const text = await readingTestGenerateText(
        generateTargetedPracticePrompt(extractedText, studentAge, missedSkills),
        getSystemPrompt(),
      );

      const questions: ReadingTestQuestion[] = JSON.parse(text);
      setReadingTest(questions);

      // Log for achievements
      logActivity("targeted_practice_complete", { sessionId: readingStore.id || undefined });

      toast.dismiss(toastId);
      setStoreStatus("idle");
      setStatus("idle");
      return questions;
    } catch (error) {
      toast.dismiss(toastId);
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return [];
    }
  }

  async function askTutor(
    question: string,
    history: ChatMessage[],
    selectedText?: string,
    images?: string[],
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const { studentAge, extractedText } = useReadingStore.getState();
    const { tutorModel } = useSettingStore.getState();
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return "";
    }

    const visionModel = await createModelProvider(tutorModel);
    
    const messages: any[] = history
      .slice(-20)
      .map((msg) => {
        const textContent = msg.selectedText 
          ? `${msg.content}\n\n[Context: The student is asking about this text: "${msg.selectedText}"]`
          : msg.content;
        
        if (msg.role === "user" && msg.images && msg.images.length > 0) {
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

    const hasImages = images && images.length > 0;
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

    try {
      const result = streamText({
        model: visionModel,
        system: readingTutorSystemPrompt(studentAge, extractedText),
        messages,
        experimental_transform: smoothTextStream(smoothTextStreamType),
      });

      for await (const textPart of result.textStream) {
        fullResponse += textPart;
        if (onChunk) {
          onChunk(fullResponse);
        }
      }

      return fullResponse;
    } catch (error) {
      handleError(error);
      return "";
    }
  }

  async function analyzeGrammarTopics() {
    const { studentAge, extractedText, setGrammarTopics, setStatus: setStoreStatus, setError } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    setStoreStatus("grammar");
    setStatus("grammar");

    const toastId = toast.info(i18next.t("reading.grammar.analyzingWait"), { duration: Infinity });

    try {
      const text = await grammarGenerateText(
        analyzeGrammarTopicsPrompt(studentAge, extractedText),
        getSystemPrompt(),
      );

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
      setStoreStatus("idle");
      setStatus("idle");
      return topics;
    } catch (error) {
      toast.dismiss(toastId);
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return [];
    }
  }

  async function generateGrammarQuiz() {
    const { studentAge, extractedText, grammarTopics, setGrammarQuiz, setStatus: setStoreStatus, setError } = readingStore;

    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    if (grammarTopics.length === 0) {
      toast.error("Please analyze grammar topics first.");
      return [];
    }

    setStoreStatus("grammar");
    setStatus("grammar");

    const toastId = toast.info(i18next.t("reading.grammar.quiz.generatingWait"), { duration: Infinity });

    try {
      const text = await grammarGenerateText(
        generateGrammarQuizPrompt(extractedText, studentAge, grammarTopics),
        getSystemPrompt(),
      );

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
      setStoreStatus("idle");
      setStatus("idle");
      return questions;
    } catch (error) {
      toast.dismiss(toastId);
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return [];
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

      const evaluation = JSON.parse(text);
      const earnedPoints = Math.min(Math.max(0, evaluation.earnedPoints), maxPoints);

      setGrammarQuizQuestionPoints(questionId, earnedPoints);

      return { earnedPoints, feedback: evaluation.feedback };
    } catch (error) {
      console.error("Error evaluating grammar answer:", error);
      setGrammarQuizQuestionPoints(questionId, 0);
      return { earnedPoints: 0, feedback: "Could not evaluate answer." };
    }
  }

  // ── Grammar Games AI helpers ───────────────────────────────────────────────

  /** Generates (or refreshes) Error Surgery challenges using grammarTopics. */
  async function generateErrorSurgeryContent(): Promise<ErrorSurgeryChallenge[]> {
    const { grammarTopics, studentAge, setGrammarErrorChallenges } = readingStore;

    if (grammarTopics.length === 0) return [];

    try {
      const text = await grammarGenerateText(
        generateErrorSurgeryPrompt(grammarTopics, studentAge),
        getSystemPrompt(),
      );

      const challenges: ErrorSurgeryChallenge[] = JSON.parse(text);
      setGrammarErrorChallenges(challenges);
      return challenges;
    } catch (error) {
      handleError(error);
      return [];
    }
  }

  /** Generates (or refreshes) Word Order Scramble challenges, persisted to store. */
  async function generateGrammarScrambleContent(): Promise<GrammarScrambleChallenge[]> {
    const { grammarTopics, studentAge, setGrammarScrambleChallenges } = readingStore;

    if (grammarTopics.length === 0) return [];

    try {
      const text = await grammarGenerateText(
        generateGrammarScramblePrompt(grammarTopics, studentAge),
        getSystemPrompt(),
      );

      const challenges = JSON.parse(text) as GrammarScrambleChallenge[];
      setGrammarScrambleChallenges(challenges);
      return challenges;
    } catch (error) {
      handleError(error);
      return [];
    }
  }

  /** Generates (or refreshes) Grammar Workshop slot-fill challenges, persisted to store. */
  async function generateGrammarWorkshopContent(): Promise<GrammarWorkshopChallenge[]> {
    const { grammarTopics, studentAge, setGrammarWorkshopChallenges } = readingStore;

    if (grammarTopics.length === 0) return [];

    try {
      const text = await grammarGenerateText(
        generateGrammarWorkshopPrompt(grammarTopics, studentAge),
        getSystemPrompt(),
      );

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
      return challenges;
    } catch (error) {
      handleError(error);
      return [];
    }
  }

  /** Generates (or refreshes) MCQ questions for Grammar Roulette + Duel, persisted to store. */
  async function generateGrammarQuestions(): Promise<GrammarGameQuestion[]> {
    const { grammarTopics, studentAge, setGrammarGameQuestions } = readingStore;

    if (grammarTopics.length === 0) return [];

    try {
      const text = await grammarGenerateText(
        generateGrammarQuestionsPrompt(grammarTopics, studentAge),
        getSystemPrompt(),
      );

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
      return questions;
    } catch (error) {
      handleError(error);
      return [];
    }
  }

  function saveSession() {
    const { backup } = readingStore;
    const { save } = useHistoryStore.getState();
    const session = backup();
    return save(session);
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
    status,
    extractTextFromImage,
    generateTitle,
    generateSummary,
    adaptText,
    simplifyText,
    generateMindMap,
    generateVisualization,
    generateReadingTest,
    generateTargetedPractice,
    generateGlossary,
    analyzeGrammarTopics,
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
    saveSession,
    loadSession,
  };
}

export default useReadingAssistant;
