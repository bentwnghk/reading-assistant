import { create } from "zustand";
import { persist } from "zustand/middleware";

export const AVAILABLE_MODELS = [
  "gpt-5-mini",
  "deepseek-chat",
  "gemini-3-flash-preview",
  "glm-4.7",
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

export const VISION_MODELS = ["gpt-4.1-mini", "gpt-5-mini"] as const;

export type VisionModel = (typeof VISION_MODELS)[number];

export const TUTOR_MODELS = [
  "gpt-5-mini",
  "gemini-3-flash-preview",
  "gpt-5.1",
] as const;

export type TutorModel = (typeof TUTOR_MODELS)[number];

export const TTS_VOICES = ["alloy", "nova", "echo", "fable", "onyx", "shimmer"] as const;

export type TTSVoice = (typeof TTS_VOICES)[number];

export interface SettingStore {
  provider: string;
  mode: string;
  model: AvailableModel;
  visionModel: VisionModel;
  summaryModel: AvailableModel;
  mindMapModel: AvailableModel;
  adaptedTextModel: AvailableModel;
  simplifyModel: AvailableModel;
  readingTestModel: AvailableModel;
  glossaryModel: AvailableModel;
  sentenceAnalysisModel: AvailableModel;
  tutorModel: TutorModel;
  ttsVoice: TTSVoice;
  autoSpeakFlashcard: boolean;
  cheatMode: boolean;
  showGiveAnswer: boolean;
  openAIApiKey: string;
  openAIApiProxy: string;
  openaicompatibleApiKey: string;
  openaicompatibleApiProxy: string;
  accessPassword: string;
  language: string;
  theme: string;
  debug: "enable" | "disable";
  smoothTextStreamType: "character" | "word" | "line";
}

interface SettingActions {
  update: (values: Partial<SettingStore>) => void;
  reset: () => void;
}

export const defaultValues: SettingStore = {
  provider: "openaicompatible",
  mode: "",
  model: "gpt-5-mini",
  visionModel: "gpt-4.1-mini",
  summaryModel: "deepseek-chat",
  mindMapModel: "deepseek-chat",
  adaptedTextModel: "deepseek-chat",
  simplifyModel: "deepseek-chat",
  readingTestModel: "deepseek-chat",
  glossaryModel: "deepseek-chat",
  sentenceAnalysisModel: "deepseek-chat",
  tutorModel: "gpt-5-mini",
  ttsVoice: "alloy",
  autoSpeakFlashcard: true,
  cheatMode: false,
  showGiveAnswer: false,
  openAIApiKey: "",
  openAIApiProxy: "https://api.mr5ai.com",
  openaicompatibleApiKey: "",
  openaicompatibleApiProxy: "https://api.mr5ai.com",
  accessPassword: "",
  language: "system",
  theme: "system",
  debug: "disable",
  smoothTextStreamType: "word",
};

export const useSettingStore = create(
  persist<SettingStore & SettingActions>(
    (set) => ({
      ...defaultValues,
      update: (values) => set(values),
      reset: () => set(defaultValues),
    }),
    { name: "setting" }
  )
);
