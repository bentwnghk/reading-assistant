/**
 * Shared text-to-speech utility.
 *
 * Consumed by both the multiplayer spelling battle arena
 * (`SpellingBattleArena.tsx`) and the solo spelling game
 * (`VocabularySpelling.tsx`). Playback uses the Web Audio API (AudioContext),
 * not plain HTMLAudioElement. This is required for iOS Safari:
 * HTMLAudioElement.play() is rejected unless called inside a user gesture, and
 * a gesture-bound play does NOT transfer to other (or freshly created) <audio>
 * elements — so per-word auto-play (driven by a socket event or a timer, not a
 * gesture) keeps failing no matter how many times the user taps. An
 * AudioContext, by contrast, only needs ctx.resume() once inside a gesture;
 * afterwards the context stays "running" for the page's lifetime and any
 * number of decoded buffers can be scheduled (source.start()) WITHOUT further
 * gestures. See `unlockAudio()` / `isAudioUnlocked()`.
 */
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";
import {
  TTS_MODELS,
  TTS_MODEL_RESPONSE_FORMATS,
  getEffectiveTtsVoice,
  isGeminiTtsModel,
  type TtsModel,
} from "@/store/setting";

export interface SpeakWordOptions {
  word: string;
  /** TTS model id (a TTS_MODELS entry). Defaults to "tts-1". */
  model?: string;
  voice: string;
  speed: number;
  /** "local" | "subscription" | (default proxy) */
  mode: string;
  openaicompatibleApiKey?: string;
  openaicompatibleApiProxy?: string;
  accessPassword?: string;
  /** Caller-owned audio ref — only used by the HTMLAudioElement fallback path. */
  audioRef: { current: HTMLAudioElement | null };
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  /**
   * Fired when playback can't start because the AudioContext is not yet
   * "running" (iOS Safari / Chrome Android autoplay policy). The caller should
   * prompt for a tap (a user gesture) which calls `unlockAudio()`; once
   * running, future auto-plays succeed automatically. Note: nothing is fetched
   * when this fires, so no billed TTS request is wasted.
   */
  onBlocked?: () => void;
}

// ── Web Audio session (single, app-lifetime AudioContext) ─────────────────
let audioCtx: AudioContext | null = null;
// The currently-scheduled source, if any. Stopped/swapped when a new word
// starts so words never overlap (mirrors the old audioRef.current.pause()).
let currentSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
  } catch {
    return null;
  }
  return audioCtx;
}

export function isAudioUnlocked(): boolean {
  const ctx = getAudioContext();
  return !!ctx && ctx.state === "running";
}

/**
 * The shared, app-lifetime AudioContext used for TTS playback. Re-exported for
 * the game SFX engine (`src/utils/sfx.ts`), which schedules its own short
 * oscillator envelopes on the SAME context — required by the iOS Safari
 * autoplay policy (one gesture-resumed context serves all audio) and mandated
 * by the "exactly one TTS/audio implementation" rule. SFX never touch
 * `currentSource`, so TTS playback is unaffected.
 */
export function getSharedAudioContext(): AudioContext | null {
  return getAudioContext();
}

/**
 * Whether a TTS buffer is currently playing. The SFX engine mutes the
 * countdown "tick" while a word is being spoken (listen-type mode) so the
 * two never overlap.
 */
export function isSpeaking(): boolean {
  return currentSource !== null;
}

/**
 * Resume the AudioContext from within a user gesture handler (click / touch /
 * pointerdown). This is the one-time iOS unlock: once the context is "running"
 * it stays running for the page's lifetime, and programmatic auto-play (from
 * setTimeout / socket events) is permitted without further gestures. Safe to
 * call many times — a no-op once running. Returns the post-call unlocked state.
 */
export async function unlockAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === "running") return true;
  try {
    await ctx.resume();
  } catch {
    // Resume rejected (not in a fresh gesture / blocked by policy). Leave as
    // is; the next gesture retries and the caller falls back to a tap prompt.
  }
  // Re-read via the helper: ctx.resume() may have changed state, and this
  // avoids the stale post-await narrowing of ctx.state in the control flow.
  return isAudioUnlocked();
}

/** Stop any in-flight playback immediately (e.g. on unmount / leave battle). */
export function stopSpeaking(): void {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      // Already ended/stopped.
    }
    try {
      currentSource.disconnect();
    } catch {
      // Already disconnected.
    }
    currentSource = null;
  }
}

/**
 * decodeAudioData wrapper that tolerates the legacy callback-only signature
 * (older Safari) as well as the modern Promise form.
 */
function decodeAudioDataP(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    let settled = false;
    const ok = (buf: AudioBuffer) => {
      if (!settled) {
        settled = true;
        resolve(buf);
      }
    };
    const fail = (err: unknown) => {
      if (!settled) {
        settled = true;
        reject(err instanceof Error ? err : new Error("Audio decode failed"));
      }
    };
    try {
      const ret = ctx.decodeAudioData(data, ok, fail);
      if (ret && typeof (ret as Promise<AudioBuffer>).then === "function") {
        (ret as Promise<AudioBuffer>).then(ok, fail);
      }
    } catch (err) {
      fail(err);
    }
  });
}

// ── Raw PCM (response_format "pcm") support ────────────────────────────────
// Some OpenAI-compatible TTS models (e.g. gemini-3.1-flash-tts-preview) only
// return raw PCM — 16-bit little-endian mono at 24kHz (the OpenAI-compatible
// "pcm" contract) — instead of a container format. Browsers can neither
// decodeAudioData() headerless PCM nor play it as a plain Blob, so it is
// converted manually into an AudioBuffer (or wrapped with a RIFF/WAV header
// for the <audio> fallback path).
const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;

function pcm16ToAudioBuffer(ctx: AudioContext, data: ArrayBuffer): AudioBuffer {
  const sampleCount = Math.floor(data.byteLength / 2);
  const buffer = ctx.createBuffer(PCM_CHANNELS, sampleCount, PCM_SAMPLE_RATE);
  const channel = buffer.getChannelData(0);
  const int16 = new Int16Array(data, 0, sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    channel[i] = int16[i] / 32768;
  }
  return buffer;
}

function pcm16ToWavBlob(data: ArrayBuffer): Blob {
  const sampleCount = Math.floor(data.byteLength / 2);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, PCM_CHANNELS, true);
  view.setUint32(24, PCM_SAMPLE_RATE, true);
  view.setUint32(28, (PCM_SAMPLE_RATE * PCM_CHANNELS * 2), true); // byte rate
  view.setUint16(32, PCM_CHANNELS * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, "data");
  view.setUint32(40, sampleCount * 2, true);
  return new Blob([header, data], { type: "audio/wav" });
}

// ── Shared request building ────────────────────────────────────────────────

function resolveTtsModel(model: string | undefined): TtsModel {
  return TTS_MODELS.includes(model as TtsModel) ? (model as TtsModel) : "tts-1";
}

/** Recitation framing for Gemini TTS models. They are LLM-based and treat the
 *  input as a controllable prompt (the official docs steer delivery with
 *  patterns like `Say in a spooky whisper: "..."`). A bare payload — e.g. the
 *  single word "antagonist" or "romantic" — is ambiguous, so the model
 *  sometimes *performs* it (acts out the word) instead of reciting it, and the
 *  improvised performance can trip the safety filter (PROHIBITED_CONTENT →
 *  400/500, which the docs list as a known gemini-3.1-flash-tts-preview
 *  limitation). Framing the payload as an explicit verbatim recitation
 *  instruction resolves both failure modes. Inner double quotes are normalized
 *  to apostrophes so they can't break the quotation convention.
 *  Ref: https://ai.google.dev/gemini-api/docs/speech-generation */
const GEMINI_TTS_RECITATION_PREFIX =
  "Say the following text exactly as written, word for word, in a neutral and clear tone";

function frameTtsInput(model: TtsModel, text: string): string {
  return isGeminiTtsModel(model)
    ? `${GEMINI_TTS_RECITATION_PREFIX}: "${text.replace(/"/g, "'")}"`
    : text;
}

interface TtsRequest {
  url: string;
  headers: HeadersInit;
  body: string;
}

/** Builds the /v1/audio/speech request for the given model/voice/format.
 *  Handles all three billing modes (local / subscription / proxy signature).
 *  The `speed` param is only sent to mp3 models — pcm-only models ignore or
 *  reject it, so playback rate is applied client-side there instead. */
function buildTtsRequest(opts: {
  text: string;
  model?: string;
  voice: string;
  speed: number;
  mode: string;
  openaicompatibleApiKey?: string;
  openaicompatibleApiProxy?: string;
  accessPassword?: string;
}): TtsRequest {
  const ttsModel = resolveTtsModel(opts.model);
  const voice = getEffectiveTtsVoice(ttsModel, opts.voice);
  const responseFormat = TTS_MODEL_RESPONSE_FORMATS[ttsModel];

  const headers: HeadersInit = { "Content-Type": "application/json" };
  let url: string;
  if (opts.mode === "local") {
    url = `${completePath(opts.openaicompatibleApiProxy ?? "", "/v1")}/audio/speech`;
    if (opts.openaicompatibleApiKey) {
      headers["Authorization"] = `Bearer ${opts.openaicompatibleApiKey}`;
    }
  } else if (opts.mode === "subscription") {
    url = "/api/ai/subscription/v1/audio/speech";
  } else {
    url = "/api/ai/openaicompatible/v1/audio/speech";
    if (opts.accessPassword) {
      headers["Authorization"] = `Bearer ${generateSignature(opts.accessPassword, Date.now())}`;
    }
  }

  const body: Record<string, unknown> = {
    model: ttsModel,
    input: frameTtsInput(ttsModel, opts.text),
    voice,
    response_format: responseFormat,
  };
  if (responseFormat !== "pcm") {
    body.speed = opts.speed;
  }

  return { url, headers, body: JSON.stringify(body) };
}

/** Parses a non-ok TTS response into a user-facing error message. */
async function parseTtsError(response: Response): Promise<string> {
  const errText = await response.text();
  let errorMsg = `TTS request failed (${response.status})`;
  try {
    const parsed = JSON.parse(errText);
    if (parsed.error?.status && parsed.error?.message) {
      errorMsg = `[${parsed.error.status}]: ${parsed.error.message}`;
    }
  } catch {
    // keep default message
  }
  return errorMsg;
}

export async function speakWord(opts: SpeakWordOptions): Promise<void> {
  const { word } = opts;
  if (!word) return;

  const ctx = getAudioContext();
  // If an AudioContext exists but isn't "running", the autoplay policy will
  // block playback. Ask the caller for a tap instead of fetching (and billing)
  // a TTS request that can't be heard. The caller's speaker button runs
  // unlockAudio() inside its click handler, flipping the context to "running";
  // the next word's auto-speak then succeeds.
  if (ctx && ctx.state !== "running") {
    opts.onBlocked?.();
    return;
  }

  opts.onStart?.();

  try {
    const ttsModel = resolveTtsModel(opts.model);
    const responseFormat = TTS_MODEL_RESPONSE_FORMATS[ttsModel];
    const { url, headers, body } = buildTtsRequest({ ...opts, text: word });

    const response = await fetch(url, { method: "POST", headers, body });

    if (!response.ok) {
      opts.onError?.(await parseTtsError(response));
      opts.onEnd?.();
      return;
    }

    const audioData = await response.arrayBuffer();

    // Preferred path: Web Audio (deterministic auto-play after one unlock).
    if (ctx) {
      const decoded =
        responseFormat === "pcm"
          ? pcm16ToAudioBuffer(ctx, audioData)
          : await decodeAudioDataP(ctx, audioData);
      stopSpeaking(); // cut off any still-playing previous word
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      // pcm models don't take a server-side speed param — apply it here.
      if (responseFormat === "pcm" && opts.speed && opts.speed !== 1) {
        source.playbackRate.value = opts.speed;
      }
      currentSource = source;
      source.onended = () => {
        if (currentSource === source) currentSource = null;
        opts.onEnd?.();
      };
      source.start();
      return; // onEnd fires from onended above; do NOT double-fire it.
    }

    // Fallback: HTMLAudioElement (only when AudioContext is unavailable — e.g.
    // very old browsers). Subject to autoplay policy, but those environments
    // are generally desktop and lenient.
    const audioBlob =
      responseFormat === "pcm"
        ? pcm16ToWavBlob(audioData)
        : new Blob([audioData], { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(audioBlob);
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      opts.audioRef.current = audio;
      if (responseFormat === "pcm" && opts.speed && opts.speed !== 1) {
        audio.playbackRate = opts.speed;
      }
      audio.oncanplay = () => {
        audio.play().then(resolve).catch(reject);
      };
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        opts.audioRef.current = null;
        opts.onEnd?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        opts.audioRef.current = null;
        reject(new Error("Audio element error"));
      };
      audio.src = audioUrl;
      audio.load();
    });
  } catch (error) {
    opts.onError?.(error instanceof Error ? error.message : "TTS failed");
    opts.onEnd?.();
  }
}

// ── Bimodal reading-while-listening (sentence-queued playback) ──────────────

export interface ReadAlongOptions {
  sentences: string[];
  /** Index to begin playback from (default 0). Used for click-to-jump. */
  startIndex?: number;
  /** TTS model id (a TTS_MODELS entry). Defaults to "tts-1". */
  model?: string;
  voice: string;
  speed: number;
  mode: string;
  openaicompatibleApiKey?: string;
  openaicompatibleApiProxy?: string;
  accessPassword?: string;
  audioRef: { current: HTMLAudioElement | null };
  onSentenceStart?: (index: number) => void;
  onSentenceEnd?: (index: number) => void;
  onComplete?: () => void;
  onError?: (message: string) => void;
  onBlocked?: () => void;
}

/**
 * Plays an array of sentences sequentially via the Web Audio API, firing
 * `onSentenceStart(i)` before each sentence plays (so the caller can highlight
 * the active sentence) and `onSentenceEnd(i)` when it finishes. Reuses the
 * single AudioContext + `currentSource` plumbing from `speakWord`.
 *
 * Cancellation uses a monotonically-incrementing token instead of a boolean
 * flag. This correctly handles the click-to-jump scenario: when the user
 * clicks a sentence mid-playback, `stopReadAlong()` invalidates the old loop,
 * then a fresh `readAlong()` call with a new token takes over. A boolean flag
 * would be reset to `false` by the new call before the old loop checks it,
 * causing both loops to run concurrently and interleave audio.
 */
let _readAlongToken = 0;

export function stopReadAlong(): void {
  _readAlongToken++;
  stopSpeaking();
}

export async function readAlong(opts: ReadAlongOptions): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state !== "running") {
    opts.onBlocked?.();
    return;
  }

  const myToken = ++_readAlongToken;

  for (let i = opts.startIndex ?? 0; i < opts.sentences.length; i++) {
    if (_readAlongToken !== myToken) return;
    const sentence = opts.sentences[i];
    if (!sentence || !sentence.trim()) continue;

    opts.onSentenceStart?.(i);

    try {
      const ttsModel = resolveTtsModel(opts.model);
      const responseFormat = TTS_MODEL_RESPONSE_FORMATS[ttsModel];
      const { url, headers, body } = buildTtsRequest({ ...opts, text: sentence });

      const response = await fetch(url, { method: "POST", headers, body });

      if (_readAlongToken !== myToken) return;

      if (!response.ok) {
        opts.onError?.(await parseTtsError(response));
        continue;
      }

      const audioData = await response.arrayBuffer();
      if (_readAlongToken !== myToken) return;

      if (ctx) {
        const decoded =
          responseFormat === "pcm"
            ? pcm16ToAudioBuffer(ctx, audioData)
            : await decodeAudioDataP(ctx, audioData);
        if (_readAlongToken !== myToken) return;
        stopSpeaking();
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        // pcm models don't take a server-side speed param — apply it here.
        if (responseFormat === "pcm" && opts.speed && opts.speed !== 1) {
          source.playbackRate.value = opts.speed;
        }
        currentSource = source;
        await new Promise<void>((resolve) => {
          source.onended = () => {
            if (currentSource === source) currentSource = null;
            opts.onSentenceEnd?.(i);
            resolve();
          };
          source.start();
        });
      } else {
        // Fallback: HTMLAudioElement (lenient environments)
        const audioBlob =
          responseFormat === "pcm"
            ? pcm16ToWavBlob(audioData)
            : new Blob([audioData], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);
        await new Promise<void>((resolve) => {
          const audio = new Audio();
          opts.audioRef.current = audio;
          if (responseFormat === "pcm" && opts.speed && opts.speed !== 1) {
            audio.playbackRate = opts.speed;
          }
          audio.oncanplay = () => {
            audio.play().then(resolve).catch(resolve);
          };
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            opts.audioRef.current = null;
            opts.onSentenceEnd?.(i);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            opts.audioRef.current = null;
            resolve();
          };
          audio.src = audioUrl;
          audio.load();
        });
      }
    } catch {
      // Skip to next sentence on error; don't abort the whole sequence.
      opts.onSentenceEnd?.(i);
    }
  }

  if (_readAlongToken === myToken) {
    opts.onComplete?.();
  }
}
