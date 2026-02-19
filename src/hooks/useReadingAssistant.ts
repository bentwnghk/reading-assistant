import { useState } from "react";
import { streamText, smoothStream, generateText } from "ai";
import { toast } from "sonner";
import { useSettingStore } from "@/store/setting";
import { useReadingStore, type ReadingStatus } from "@/store/reading";
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
  generateGlossaryPrompt,
} from "@/constants/readingPrompts";
import { parseError } from "@/utils/error";

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

function useReadingAssistant() {
  const { smoothTextStreamType, model, visionModel: visionModelName } = useSettingStore();
  const readingStore = useReadingStore();
  const { createModelProvider } = useModelProvider();
  const [status, setStatus] = useState<ReadingStatus>("idle");

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
      for await (const textPart of result.textStream) {
        text += textPart;
        setExtractedText(text);
      }

      setStoreStatus("idle");
      setStatus("idle");
      return text;
    } catch (error) {
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return "";
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
      const thinkingModel = await createModelProvider(model);
      
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
      for await (const textPart of result.textStream) {
        text += textPart;
        setSummary(text);
      }

      setStoreStatus("idle");
      setStatus("idle");
      return text;
    } catch (error) {
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
      const thinkingModel = await createModelProvider(model);
      
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
      for await (const textPart of result.textStream) {
        text += textPart;
        setAdaptedText(text);
      }

      setStoreStatus("idle");
      setStatus("idle");
      return text;
    } catch (error) {
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
      const thinkingModel = await createModelProvider(model);
      
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
      for await (const textPart of result.textStream) {
        text += textPart;
        setSimplifiedText(text);
      }

      setStoreStatus("idle");
      setStatus("idle");
      return text;
    } catch (error) {
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return "";
    }
  }

  async function generateMindMap() {
    const { extractedText, setMindMap, setStatus: setStoreStatus, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return "";
    }

    setStoreStatus("mindmap");
    setStatus("mindmap");

    try {
      const thinkingModel = await createModelProvider(model);
      
      const result = streamText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: generateMindMapPrompt(extractedText),
        experimental_transform: smoothTextStream(smoothTextStreamType),
        onError: (error) => {
          const msg = handleError(error);
          setError(msg);
          setStoreStatus("error");
          setStatus("idle");
        },
      });

      let text = "";
      for await (const textPart of result.textStream) {
        text += textPart;
        setMindMap(text);
      }

      setStoreStatus("idle");
      setStatus("idle");
      return text;
    } catch (error) {
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return "";
    }
  }

  async function generateReadingTest() {
    const { studentAge, extractedText, setReadingTest, setStatus: setStoreStatus, setError } = readingStore;
    
    if (!extractedText) {
      toast.error("Please extract text from an image first.");
      return [];
    }

    setStoreStatus("testing");
    setStatus("testing");

    try {
      const thinkingModel = await createModelProvider(model);
      
      const result = await generateText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: generateReadingTestPrompt(extractedText, studentAge),
      });

      let text = result.text.trim();
      
      if (text.startsWith("```json")) {
        text = text.slice(7);
      }
      if (text.startsWith("```")) {
        text = text.slice(3);
      }
      if (text.endsWith("```")) {
        text = text.slice(0, -3);
      }
      text = text.trim();

      const questions: ReadingTestQuestion[] = JSON.parse(text);
      setReadingTest(questions);

      setStoreStatus("idle");
      setStatus("idle");
      return questions;
    } catch (error) {
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

    try {
      const thinkingModel = await createModelProvider(model);
      
      const result = await generateText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: generateGlossaryPrompt(extractedText, highlightedWords),
      });

      let text = result.text.trim();
      
      if (text.startsWith("```json")) {
        text = text.slice(7);
      }
      if (text.startsWith("```")) {
        text = text.slice(3);
      }
      if (text.endsWith("```")) {
        text = text.slice(0, -3);
      }
      text = text.trim();

      const entries: GlossaryEntry[] = JSON.parse(text);
      setGlossary(entries);

      setStoreStatus("idle");
      setStatus("idle");
      return entries;
    } catch (error) {
      const msg = handleError(error);
      setError(msg);
      setStoreStatus("error");
      setStatus("idle");
      return [];
    }
  }

  function calculateTestScore() {
    const { readingTest, setTestScore, setTestCompleted } = readingStore;
    
    let correct = 0;
    const totalQuestions = readingTest.filter(q => q.type !== "short-answer").length;
    
    for (const question of readingTest) {
      if (question.type === "short-answer") continue;
      
      const userAnswer = question.userAnswer?.toLowerCase().trim();
      const correctAnswer = question.correctAnswer.toLowerCase().trim();
      
      if (question.type === "multiple-choice") {
        if (userAnswer === correctAnswer || userAnswer === correctAnswer.charAt(0)) {
          correct++;
        }
      } else if (question.type === "true-false") {
        if (userAnswer === correctAnswer) {
          correct++;
        }
      }
    }
    
    const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    setTestScore(score);
    setTestCompleted(true);
    
    return score;
  }

  function saveSession() {
    const { backup } = readingStore;
    const { save } = useHistoryStore.getState();
    const session = backup();
    return save(session);
  }

  function loadSession(id: string) {
    const { load } = useHistoryStore.getState();
    const session = load(id);
    if (session) {
      readingStore.restore(session);
      return true;
    }
    return false;
  }

  return {
    status,
    extractTextFromImage,
    generateSummary,
    adaptText,
    simplifyText,
    generateMindMap,
    generateReadingTest,
    generateGlossary,
    calculateTestScore,
    saveSession,
    loadSession,
  };
}

export default useReadingAssistant;
