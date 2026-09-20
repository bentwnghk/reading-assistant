import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";

export const AVAILABLE_MODELS = [
  "gpt-5.4-mini",
  "gpt-5.6-luna",
  "deepseek-flash",
  "gemini-3.7-flash",
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];

export const VISION_MODELS = ["gpt-5-nano", "gpt-5.6-luna"] as const;

export type VisionModel = (typeof VISION_MODELS)[number];

export const IMAGE_MODELS = [
  "google/gemini-3.1-flash-lite-image",
  "x-ai/grok-imagine-image-2.0",
  "google/gemini-3.1-flash-image",
] as const;

export type ImageModel = (typeof IMAGE_MODELS)[number];

// Premium image model selectable only by admins/super-admins and
// meter-billing (mode "local") users; hidden from everyone else's dropdown.
export const RESTRICTED_IMAGE_MODELS: string[] = [
  "google/gemini-3.1-flash-image",
];

export const TUTOR_MODELS = [
  "deepseek-flash",
  "gemini-3.8-flash",
  "step-3.7-flash",
  "gpt-5.6-terra",
] as const;

export type TutorModel = (typeof TUTOR_MODELS)[number];

export const BASIC_TUTOR_MODELS = [
  "deepseek-flash",
  "gpt-5.6-luna",
] as const;

export type BasicTutorModel = (typeof BASIC_TUTOR_MODELS)[number];

export const READING_TEXT_MODELS = [
  "gpt-5.4-mini",
  "gpt-5.1",
  "deepseek-flash",
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
  "gemini-3.8-flash",
  "gpt-5.6-terra",
];

// Pure model-id renames — the old ids are no longer valid anywhere.
// Applies to every model setting. Keep in sync with
// scripts/migrate-deepseek-flash-rename.sql.
const RENAMED_MODELS: Record<string, string> = {
  "deepseek-v4-flash": "deepseek-flash",
  "deepseek-v4-flash-vision-exp": "deepseek-flash",
};

// Retired Advanced AI Tutor models remapped to their replacements.
// Keep in sync with scripts/migrate-tutor-model-replacements.sql.
const TUTOR_MODEL_REPLACEMENTS: Record<string, TutorModel> = {
  "gpt-5.4-mini": "deepseek-flash",
  "gemini-3.7-flash": "gemini-3.8-flash",
};

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

export const TTS_MODELS = ["tts-1", "gemini-3.1-flash-tts-preview"] as const;

export type TtsModel = (typeof TTS_MODELS)[number];

export const GEMINI_TTS_VOICES = ["enceladus", "kore", "puck", "aoede", "orus", "gacrux"] as const;

export const ALL_TTS_VOICES = [...TTS_VOICES, ...GEMINI_TTS_VOICES] as const;

export type AnyTtsVoice = (typeof ALL_TTS_VOICES)[number];

/** Voice catalog per TTS model — the Settings TTS tab renders the list for the
 *  currently selected model, and switching models coerces ttsVoice into the
 *  new list (see getEffectiveTtsVoice). */
export const TTS_MODEL_VOICES: Record<TtsModel, readonly AnyTtsVoice[]> = {
  "tts-1": TTS_VOICES,
  "gemini-3.1-flash-tts-preview": GEMINI_TTS_VOICES,
};

export const DEFAULT_TTS_VOICES: Record<TtsModel, AnyTtsVoice> = {
  "tts-1": "onyx",
  "gemini-3.1-flash-tts-preview": "kore",
};

/** Audio format each TTS model is requested with (and returns) from
 *  /v1/audio/speech. tts-1 serves mp3; the Gemini TTS model only supports raw
 *  PCM (24kHz 16-bit mono), which the client decodes manually — see
 *  src/utils/tts.ts. */
export const TTS_MODEL_RESPONSE_FORMATS: Record<TtsModel, "mp3" | "pcm"> = {
  "tts-1": "mp3",
  "gemini-3.1-flash-tts-preview": "pcm",
};

/** Resolves the voice to actually send for a model: the stored voice when it
 *  belongs to the model's catalog, else the model's default. Guards stale
 *  persisted pairs (e.g. DB settings saved before a model switch). */
export function getEffectiveTtsVoice(model: string, voice: string): string {
  const voices = TTS_MODEL_VOICES[model as TtsModel] ?? TTS_VOICES;
  if (voices.includes(voice as AnyTtsVoice)) return voice;
  return DEFAULT_TTS_VOICES[model as TtsModel] ?? DEFAULT_TTS_VOICES["tts-1"];
}

/** The voice remembered for a model in the per-model memory map — falling
 *  back to the model's default when nothing (or something invalid) was
 *  saved. Used when switching ttsModel so each model keeps its own voice. */
export function getSavedTtsVoiceFor(
  model: string,
  byModel: Record<string, string> | undefined
): string {
  const remembered = byModel?.[model];
  const voices = TTS_MODEL_VOICES[model as TtsModel];
  if (remembered && voices?.includes(remembered as AnyTtsVoice)) {
    return remembered;
  }
  return DEFAULT_TTS_VOICES[model as TtsModel] ?? DEFAULT_TTS_VOICES["tts-1"];
}

/** Gemini TTS models are LLM-based and treat the request input as a
 *  controllable *prompt* (style/tone/role directions are read out of the text
 *  itself — see the official prompting guide). Bare inputs like the single
 *  word "antagonist" get interpreted as a performance direction ("act as an
 *  antagonist") instead of content to recite, and the resulting "performance"
 *  can trip the safety filter (PROHIBITED_CONTENT → 400/500). Callers must
 *  wrap input for these models with an explicit recitation instruction —
 *  see buildTtsRequest() in src/utils/tts.ts. */
export function isGeminiTtsModel(model: string): boolean {
  return model.startsWith("gemini");
}

export const TTS_VOICE_LABELS: Record<string, string> = {
  alloy: "Alloy (US male)",
  nova: "Nova (US female)",
  echo: "Adam (US male)",
  fable: "Phoebe (US female)",
  onyx: "Ollie (UK male)",
  shimmer: "Ada (UK female)",
  enceladus: "Enceladus (breathy male)",
  kore: "Kore (firm female)",
  puck: "Puck (upbeat male)",
  aoede: "Aoede (breezy female)",
  orus: "Orus (firm male)",
  gacrux: "Gacrux (mature female)",
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
  imageModel: ImageModel;
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
  ttsModel: TtsModel;
  ttsVoice: string;
  /**
   * Per-model remembered TTS voice selections, so switching ttsModel back and
   * forth restores each model's last-used voice instead of resetting to the
   * model default. Keys are TtsModel ids; values are validated against each
   * model's catalog in sanitizeModelSettings. `ttsVoice` always mirrors the
   * active model's voice (kept for all call sites + server sync).
   */
  ttsVoiceByModel: Record<string, string>;
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
  /**
   * Whether this page load's auth bootstrap has settled (AuthProvider's
   * sign-in sequence finished — server settings + free-access ticket loaded).
   * Boot-only gate for first-run UI (onboarding dialog, settings banner) so
   * they can't flash open before freeAccessGranted is known. Never restored
   * from localStorage and never synced to the server.
   */
  authDataLoaded: boolean;
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
    authDataLoaded: _authDataLoaded,
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
  imageModel: "google/gemini-3.1-flash-lite-image",
  prereadingModel: "gpt-5.6-luna",
  summaryModel: "deepseek-flash",
  mindMapModel: "deepseek-flash",
  adaptedTextModel: "deepseek-flash",
  simplifyModel: "deepseek-flash",
  readingTestModel: "gpt-5.6-luna",
  glossaryModel: "deepseek-flash",
  suggestVocabModel: "gpt-5.6-luna",
  sentenceAnalysisModel: "deepseek-flash",
  collocationModel: "gpt-5.6-luna",
  grammarModel: "gpt-5.6-luna",
  readingTextModel: "deepseek-flash",
  tutorModel: "step-3.7-flash",
  basicTutorModel: "gpt-5.6-luna",
  ttsModel: "gemini-3.1-flash-tts-preview",
  ttsVoice: "kore",
  ttsVoiceByModel: {},
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
  authDataLoaded: false,
  language: "system",
  theme: "system",
  debug: "disable",
  smoothTextStreamType: "word",
  tutorLanguage: "en",
  mindMapRenderer: "mermaid",
  lastOpenedSessionId: "",
};

function sanitizeModelSettings(state: Record<string, unknown>) {
  const allModelFields: (keyof SettingStore)[] = [
    "prereadingModel", "summaryModel", "mindMapModel", "adaptedTextModel",
    "simplifyModel", "readingTestModel", "glossaryModel", "suggestVocabModel", "sentenceAnalysisModel",
    "collocationModel", "grammarModel", "readingTextModel", "tutorModel", "basicTutorModel",
  ];
  for (const field of allModelFields) {
    const value = state[field];
    if (typeof value === "string" && value in RENAMED_MODELS) {
      state[field] = RENAMED_MODELS[value];
    }
  }
  const tutorModel = state.tutorModel;
  if (
    typeof tutorModel === "string" &&
    tutorModel in TUTOR_MODEL_REPLACEMENTS
  ) {
    state.tutorModel = TUTOR_MODEL_REPLACEMENTS[tutorModel];
  }
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
  if (!IMAGE_MODELS.includes(state.imageModel as ImageModel)) {
    state.imageModel = defaultValues.imageModel;
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
  if (!TTS_MODELS.includes(state.ttsModel as TtsModel)) {
    state.ttsModel = defaultValues.ttsModel;
  }
  // Coerce a stale voice (saved for a different TTS model) into the current
  // model's catalog so model/voice are always a valid pair.
  if (typeof state.ttsVoice === "string") {
    state.ttsVoice = getEffectiveTtsVoice(state.ttsModel as TtsModel, state.ttsVoice);
  }
  // Per-model voice memory: keep only valid (model, voice) pairs, and seed
  // the ACTIVE model's entry from ttsVoice so a legacy single-voice setting
  // (saved before per-model memory existed) carries over instead of being
  // reset to the default on the first model switch.
  const rawVoiceMap = state.ttsVoiceByModel as unknown;
  const cleanedVoiceMap: Record<string, string> = {};
  if (rawVoiceMap && typeof rawVoiceMap === "object" && !Array.isArray(rawVoiceMap)) {
    for (const model of TTS_MODELS) {
      const voice = (rawVoiceMap as Record<string, unknown>)[model];
      if (
        typeof voice === "string" &&
        (TTS_MODEL_VOICES[model] as readonly string[]).includes(voice)
      ) {
        cleanedVoiceMap[model] = voice;
      }
    }
  }
  state.ttsVoiceByModel = cleanedVoiceMap;
  if (
    typeof state.ttsVoice === "string" &&
    !cleanedVoiceMap[state.ttsModel as TtsModel]
  ) {
    cleanedVoiceMap[state.ttsModel as TtsModel] = state.ttsVoice;
  }
}

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
        const sanitized = { ...settings } as unknown as Record<string, unknown>;
        // Settings loaded from user_settings bypass the persist getItem
        // sanitization, so stale model selections (e.g. after a model list
        // change whose SQL migration has not run yet) must be corrected here
        // too — otherwise the Settings form schema (z.enum over the model
        // lists) rejects the whole form.
        sanitizeModelSettings(sanitized);
        set(() => ({
          ...defaultValues,
          ...sanitized,
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
            sanitizeModelSettings(state);
            // Boot-only flag: never restore "auth data loaded" from a
            // previous page load — the current load's AuthProvider must
            // re-settle before first-run UI may open.
            state.authDataLoaded = false;
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
