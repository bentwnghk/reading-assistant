import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";

export const AVAILABLE_MODELS = [
  "gpt-5-mini",
  "deepseek-chat",
  "gemini-3-flash-preview",
  "glm-4.7",
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

export const VISION_MODELS = ["gpt-5-nano", "gpt-4.1-mini", "gpt-5-mini"] as const;

export type VisionModel = (typeof VISION_MODELS)[number];

export const TUTOR_MODELS = [
  "gpt-5-mini",
  "gemini-3-flash-preview",
  "gpt-5.1",
] as const;

export type TutorModel = (typeof TUTOR_MODELS)[number];

export const TTS_VOICES = ["alloy", "nova", "echo", "fable", "onyx", "shimmer"] as const;

export type TTSVoice = (typeof TTS_VOICES)[number];

export type ApiMode = "local" | "proxy" | "subscription" | "";

export interface SettingStore {
  provider: string;
  mode: ApiMode;
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
  lastOpenedSessionId: string;
}

interface SettingActions {
  update: (values: Partial<SettingStore>) => void;
  reset: () => void;
  loadFromServer: (settings: Partial<SettingStore>) => void;
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
  mode: "" as ApiMode | "",
  model: "gpt-5-mini",
  visionModel: "gpt-5-nano",
  summaryModel: "deepseek-chat",
  mindMapModel: "deepseek-chat",
  adaptedTextModel: "deepseek-chat",
  simplifyModel: "deepseek-chat",
  readingTestModel: "gpt-5-mini",
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
    }),
    {
      name: "setting",
      storage: {
        getItem: (name) => {
          const value = localStorage.getItem(name);
          return value ? (JSON.parse(value) as StorageValue<SettingStore & SettingActions>) : null;
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
