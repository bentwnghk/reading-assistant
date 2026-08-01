import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";

export const AVAILABLE_MODELS = [
  "gpt-5.4-mini",
  "gpt-5.6-luna",
  "deepseek-v4-flash",
  "gemini-3-flash-preview",
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

export const VISION_MODELS = ["gpt-5-nano", "gpt-5.6-luna"] as const;

export type VisionModel = (typeof VISION_MODELS)[number];

export const TUTOR_MODELS = [
  "gpt-5.4-mini",
  "gemini-3-flash-preview",
  "step-3.7-flash",
  "gpt-5.6-terra",
] as const;

export type TutorModel = (typeof TUTOR_MODELS)[number];

export const BASIC_TUTOR_MODELS = [
  "deepseek-v4-flash",
  "gpt-5.6-luna",
] as const;

export type BasicTutorModel = (typeof BASIC_TUTOR_MODELS)[number];

export const READING_TEXT_MODELS = [
  "gpt-5.4-mini",
  "gpt-5.1",
  "deepseek-v4-flash",
  "gemini-3-flash-preview",
] as const;

export type ReadingTextModel = (typeof READING_TEXT_MODELS)[number];

export const TTS_VOICES = ["alloy", "nova", "echo", "fable", "onyx", "shimmer"] as const;

export type TTSVoice = (typeof TTS_VOICES)[number];

export const TTS_VOICE_LABELS: Record<TTSVoice, string> = {
  alloy: "Alloy (US male)",
  nova: "Nova (US female)",
  echo: "Adam (US male)",
  fable: "Phoebe (US female)",
  onyx: "Ollie (UK male)",
  shimmer: "Ada (UK female)",
};

export const TTS_PLAYBACK_RATES = [0.25, 0.5, 0.75, 1.0] as const;

export type TTSPlaybackRate = (typeof TTS_PLAYBACK_RATES)[number];

export type ApiMode = "local" | "proxy" | "subscription" | "";

export type TutorLanguage = "en" | "zh";

export interface SettingStore {
  provider: string;
  mode: ApiMode;
  visionModel: VisionModel;
  summaryModel: AvailableModel;
  mindMapModel: AvailableModel;
  adaptedTextModel: AvailableModel;
  simplifyModel: AvailableModel;
  readingTestModel: AvailableModel;
  glossaryModel: AvailableModel;
  sentenceAnalysisModel: AvailableModel;
  grammarModel: AvailableModel;
  readingTextModel: ReadingTextModel;
  tutorModel: TutorModel;
  basicTutorModel: BasicTutorModel;
  ttsVoice: TTSVoice;
  ttsPlaybackRate: TTSPlaybackRate;
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
  tutorLanguage: TutorLanguage;
  lastOpenedSessionId: string;
}

interface SettingActions {
  update: (values: Partial<SettingStore>) => void;
  reset: () => void;
  loadFromServer: (settings: Partial<SettingStore>) => void;
  syncNow: () => void;
}

let currentUserId: string | null = null;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function setSettingUserId(id: string | null) {
  currentUserId = id;
}

export async function loadSettingsFromAPI(): Promise<Partial<SettingStore> | null> {
  if (!currentUserId) return null;
  
  try {
    const response = await fetch("/api/settings");
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Failed to load settings from API:", error);
    return null;
  }
}

async function syncToAPI(settings: Partial<SettingStore>) {
  if (!currentUserId) return;
  
  try {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      console.error("Failed to sync settings to API:", response.status);
    }
  } catch (error) {
    console.error("Failed to sync settings to API:", error);
  }
}

function toSyncPayload(
  settings: Partial<SettingStore & SettingActions>
): Partial<SettingStore> {
  const {
    update: _update,
    reset: _reset,
    loadFromServer: _loadFromServer,
    ...payload
  } = settings;

  return payload;
}

function debouncedSync(settings: Partial<SettingStore>) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    syncToAPI(settings);
  }, 500);
}

export const defaultValues: SettingStore = {
  provider: "openaicompatible",
  mode: "subscription" as ApiMode | "",
  visionModel: "gpt-5-nano",
  summaryModel: "deepseek-v4-flash",
  mindMapModel: "deepseek-v4-flash",
  adaptedTextModel: "deepseek-v4-flash",
  simplifyModel: "deepseek-v4-flash",
  readingTestModel: "deepseek-v4-flash",
  glossaryModel: "deepseek-v4-flash",
  sentenceAnalysisModel: "deepseek-v4-flash",
  grammarModel: "deepseek-v4-flash",
  readingTextModel: "deepseek-v4-flash",
  tutorModel: "step-3.7-flash",
  basicTutorModel: "deepseek-v4-flash",
  ttsVoice: "onyx",
  ttsPlaybackRate: 1.0 as TTSPlaybackRate,
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
  tutorLanguage: "en",
  lastOpenedSessionId: "",
};

export const useSettingStore = create(
  persist<SettingStore & SettingActions>(
    (set) => ({
      ...defaultValues,
      update: (values) => {
        set((state) => {
          const newState = { ...state, ...values };
          if (currentUserId) {
            debouncedSync(toSyncPayload(newState));
          }
          return newState;
        });
      },
      reset: () => {
        set(() => {
          if (currentUserId) {
            debouncedSync(defaultValues);
          }
          return defaultValues;
        });
      },
      loadFromServer: (settings) => {
        set(() => ({
          ...defaultValues,
          ...settings,
        }));
      },
      syncNow: () => {
        if (!currentUserId) return;
        if (syncTimeout) {
          clearTimeout(syncTimeout);
          syncTimeout = null;
        }
        syncToAPI(toSyncPayload(useSettingStore.getState()));
      },
    }),
    {
      name: "setting",
      storage: {
        getItem: (name) => {
          const value = localStorage.getItem(name);
          if (!value) return null;
          const parsed = JSON.parse(value) as StorageValue<SettingStore & SettingActions>;
          const state = parsed.state as unknown as Record<string, unknown>;
          const modelFields: (keyof SettingStore)[] = [
            "summaryModel", "mindMapModel", "adaptedTextModel",
            "simplifyModel", "readingTestModel", "glossaryModel", "sentenceAnalysisModel",
            "grammarModel",
          ];
          for (const field of modelFields) {
            if (!AVAILABLE_MODELS.includes(state[field] as AvailableModel)) {
              state[field] = defaultValues[field];
            }
          }
          if (!VISION_MODELS.includes(state.visionModel as VisionModel)) {
            state.visionModel = defaultValues.visionModel;
          }
          if (!TUTOR_MODELS.includes(state.tutorModel as TutorModel)) {
            state.tutorModel = defaultValues.tutorModel;
          }
          if (!BASIC_TUTOR_MODELS.includes(state.basicTutorModel as BasicTutorModel)) {
            state.basicTutorModel = defaultValues.basicTutorModel;
          }
          if (!READING_TEXT_MODELS.includes(state.readingTextModel as ReadingTextModel)) {
            state.readingTextModel = defaultValues.readingTextModel;
          }
          return parsed;
        },
        setItem: (name, value) => {
          if (currentUserId) return;
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

export function markLastOpenedSession(sessionId: string) {
  if (!sessionId) return;

  const { lastOpenedSessionId, update } = useSettingStore.getState();
  if (lastOpenedSessionId === sessionId) return;

  update({ lastOpenedSessionId: sessionId });
}
