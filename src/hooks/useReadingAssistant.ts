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
  const { 
    smoothTextStreamType, 
    visionModel: visionModelName,
    summaryModel,
    mindMapModel,
    adaptedTextModel,
    simplifyModel,
    readingTestModel,
    glossaryModel,
  } = useSettingStore();
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
        prompt: generateMindMapPrompt(studentAge, extractedText),
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
      const thinkingModel = await createModelProvider(readingTestModel);
      
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
      const thinkingModel = await createModelProvider(glossaryModel);
      
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
    const { readingTestModel } = useSettingStore.getState();
    const { setQuestionEarnedPoints } = readingStore;
    
    if (!userAnswer.trim()) {
      setQuestionEarnedPoints(questionId, 0);
      return { earnedPoints: 0, feedback: "No answer provided." };
    }
    
    try {
      const thinkingModel = await createModelProvider(readingTestModel);
      
      const result = await generateText({
        model: thinkingModel,
        system: getSystemPrompt(),
        prompt: `Evaluate this short-answer question response for a Hong Kong student learning English.

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
    evaluateShortAnswer,
    saveSession,
    loadSession,
  };
}

export default useReadingAssistant;
