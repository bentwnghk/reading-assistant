import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";

export const AVAILABLE_MODELS = [
  "gpt-5.4-mini",
  "gpt-5.6-luna",
  "deepseek-v4-flash",
  "gemini-3.7-flash",
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

export const VISION_MODELS = ["gpt-5-nano", "gpt-5.6-luna"] as const;

export type VisionModel = (typeof VISION_MODELS)[number];

export const TUTOR_MODELS = [
  "gpt-5.4-mini",
  "gemini-3.7-flash",
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
  "gemini-3.7-flash",
] as const;

export type ReadingTextModel = (typeof READING_TEXT_MODELS)[number];

// Preview models hidden from the Settings dropdowns for regular users.
// Super-admins and meter-billing (mode "local") users always see them.
export const RESTRICTED_MODELS: string[] = [
  "gpt-5.4-mini",
  "gemini-3.7-flash",
];

export const RESTRICTED_TUTOR_MODELS: string[] = [
  "gemini-3.7-flash",
  "gpt-5.6-terra",
];

export const RESTRICTED_MODEL_FIELD_NAMES = [
  "prereadingModel",
  "summaryModel",
  "mindMapModel",
  "adaptedTextModel",
  "simplifyModel",
  "readingTestModel",
  "glossaryModel",
  "suggestVocabModel",
  "sentenceAnalysisModel",
  "collocationModel",
  "grammarModel",
  "readingTextModel",
  "tutorModel",
] as const;

export type RestrictedModelField = (typeof RESTRICTED_MODEL_FIELD_NAMES)[number];

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

export type MindMapRenderer = "tree" | "mermaid";

export interface SettingStore {
  provider: string;
  mode: ApiMode;
  visionModel: VisionModel;
  prereadingModel: AvailableModel;
  summaryModel: AvailableModel;
  mindMapModel: AvailableModel;
  adaptedTextModel: AvailableModel;
  simplifyModel: AvailableModel;
  readingTestModel: AvailableModel;
  glossaryModel: AvailableModel;
  suggestVocabModel: AvailableModel;
  sentenceAnalysisModel: AvailableModel;
  collocationModel: AvailableModel;
  grammarModel: AvailableModel;
  readingTextModel: ReadingTextModel;
  tutorModel: TutorModel;
  basicTutorModel: BasicTutorModel;
  ttsVoice: TTSVoice;
  ttsPlaybackRate: TTSPlaybackRate;
  autoSpeakFlashcard: boolean;
  /** Game SFX (correct/wrong/streak/countdown…) played via the shared AudioContext. */
  gameSoundEffects: boolean;
  cheatMode: boolean;
  showGiveAnswer: boolean;
  openAIApiKey: string;
  openAIApiProxy: string;
  openaicompatibleApiKey: string;
  openaicompatibleApiProxy: string;
  accessPassword: string;
  /**
   * Identity-bound free (proxy) AI access granted via FREE_ACCESS_EMAILS.
   * Client mirror of /api/free-access/ticket — true means AI requests work in
   * proxy mode without an Access Password. Never synced to user_settings.
   */
  freeAccessGranted: boolean;
  language: string;
  theme: string;
  debug: "enable" | "disable";
  smoothTextStreamType: "character" | "word" | "line";
  tutorLanguage: TutorLanguage;
  mindMapRenderer: MindMapRenderer;
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
    freeAccessGranted: _freeAccessGranted,
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
  prereadingModel: "gpt-5.6-luna",
  summaryModel: "deepseek-v4-flash",
  mindMapModel: "deepseek-v4-flash",
  adaptedTextModel: "deepseek-v4-flash",
  simplifyModel: "deepseek-v4-flash",
  readingTestModel: "gpt-5.6-luna",
  glossaryModel: "deepseek-v4-flash",
  suggestVocabModel: "gpt-5.6-luna",
  sentenceAnalysisModel: "deepseek-v4-flash",
  collocationModel: "gpt-5.6-luna",
  grammarModel: "gpt-5.6-luna",
  readingTextModel: "deepseek-v4-flash",
  tutorModel: "step-3.7-flash",
  basicTutorModel: "gpt-5.6-luna",
  ttsVoice: "onyx",
  ttsPlaybackRate: 1.0 as TTSPlaybackRate,
  autoSpeakFlashcard: true,
  gameSoundEffects: true,
  cheatMode: false,
  showGiveAnswer: false,
  openAIApiKey: "",
  openAIApiProxy: "https://api.mr5ai.com",
  openaicompatibleApiKey: "",
  openaicompatibleApiProxy: "https://api.mr5ai.com",
  accessPassword: "",
  freeAccessGranted: false,
  language: "system",
  theme: "system",
  debug: "disable",
  smoothTextStreamType: "word",
  tutorLanguage: "en",
  mindMapRenderer: "mermaid",
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
          try {
            const value = localStorage.getItem(name);
            if (!value) return null;
            const parsed = JSON.parse(value) as StorageValue<SettingStore & SettingActions>;
            const state = parsed.state as unknown as Record<string, unknown>;
            const modelFields: (keyof SettingStore)[] = [
              "prereadingModel", "summaryModel", "mindMapModel", "adaptedTextModel",
              "simplifyModel", "readingTestModel", "glossaryModel", "suggestVocabModel", "sentenceAnalysisModel",
              "collocationModel", "grammarModel",
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
          } catch {
            // iOS Safari can leave truncated/corrupt localStorage after tab
            // restore, or transiently reject storage access while the origin
            // re-initializes. Fall back to defaults instead of crashing.
            try {
              localStorage.removeItem(name);
            } catch {}
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            if (currentUserId) return;
            localStorage.setItem(name, JSON.stringify(value));
          } catch {}
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {}
        },
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

export function getRestrictedModelResets(
  state: SettingStore,
  isPrivileged: boolean
): Partial<Pick<SettingStore, RestrictedModelField>> {
  if (isPrivileged) return {};
  const updates: Partial<Record<RestrictedModelField, string>> = {};
  for (const field of RESTRICTED_MODEL_FIELD_NAMES) {
    const restricted =
      field === "tutorModel" ? RESTRICTED_TUTOR_MODELS : RESTRICTED_MODELS;
    if (restricted.includes(state[field])) {
      updates[field] = defaultValues[field];
    }
  }
  return updates as Partial<Pick<SettingStore, RestrictedModelField>>;
}

// Reset any restricted model selection back to its default for users who are
// neither super-admin nor on meter billing (mode "local"). Persists the
// correction via update() (debounced server sync for authenticated users).
export function enforceRestrictedModels(role?: string | null) {
  const state = useSettingStore.getState();
  const isPrivileged = role === "super-admin" || state.mode === "local";
  const updates = getRestrictedModelResets(state, isPrivileged);
  if (Object.keys(updates).length > 0) {
    state.update(updates);
  }
  return updates;
}
