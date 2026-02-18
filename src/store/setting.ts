import { create } from "zustand";
import { persist } from "zustand/middleware";

export const AVAILABLE_MODELS = [
  "gpt-5-mini",
  "gpt-5.1",
  "gemini-3-flash-preview",
  "claude-sonnet-4-5",
  "glm-4.7",
  "minimax-m2.5",
  "deepseek-chat",
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

export interface SettingStore {
  provider: string;
  mode: string;
  model: AvailableModel;
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
  openAIApiKey: "",
  openAIApiProxy: "",
  openaicompatibleApiKey: "",
  openaicompatibleApiProxy: "",
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
