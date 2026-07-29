/**
 * Shared text-to-speech utility.
 *
 * Extracted from `VocabularySpelling.speakWord` so the multiplayer battle arena
 * reuses the exact same provider logic (local / subscription / default proxy).
 * The solo spelling component keeps its own inline copy for now — consolidate
 * later as a low-risk cleanup.
 */
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";

export interface SpeakWordOptions {
  word: string;
  voice: string;
  speed: number;
  /** "local" | "subscription" | (default proxy) */
  mode: string;
  openaicompatibleApiKey?: string;
  openaicompatibleApiProxy?: string;
  accessPassword?: string;
  /** Caller-owned audio ref — the utility sets/stops it. */
  audioRef: { current: HTMLAudioElement | null };
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  /**
   * Fired when playback is blocked by the user agent's autoplay policy
   * (iOS Safari / Chrome Android). This is a soft, expected failure — the
   * caller should prompt the user to tap a play control (a user gesture),
   * which both satisfies the policy and unlocks future programmatic plays.
   */
  onBlocked?: () => void;
}

// ── iOS Safari / mobile Chrome autoplay unlock ────────────────────────────
// These browsers reject audio.play() unless it originates inside a user
// gesture handler. Once ANY audio has been played within a gesture, the
// media session is "unlocked" and subsequent programmatic plays are allowed.
// We prime a silent sample on the first gesture to unlock the session.
let audioUnlocked = false;

// Minimal valid silent WAV (44-byte header, zero data). Used purely to
// satisfy the gesture-bound play() call that unlocks the media session.
const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

/**
 * Prime the audio session from within a user gesture handler (click / touch /
 * pointerdown). Safe to call multiple times — only the first call does work.
 * After this resolves, programmatic audio.play() (e.g. via setTimeout) is
 * permitted by iOS Safari / mobile Chrome autoplay policies.
 */
export async function unlockAudio(): Promise<void> {
  if (audioUnlocked) return;
  if (typeof window === "undefined") return;
  try {
    const primer = new Audio(SILENT_WAV_DATA_URI);
    primer.muted = false;
    // play() must be awaited within the gesture for the unlock to take hold.
    await primer.play();
    primer.pause();
    audioUnlocked = true;
  } catch {
    // Not in a gesture, or primer rejected — leave unlocked=false so the next
    // gesture retries. Surface nothing; callers fall back to a tap prompt.
  }
}

export async function speakWord(opts: SpeakWordOptions): Promise<void> {
  const { word, voice, speed, mode, audioRef } = opts;
  if (!word) return;

  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current = null;
  }

  opts.onStart?.();

  try {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    let url: string;
    if (mode === "local") {
      url = `${completePath(opts.openaicompatibleApiProxy ?? "", "/v1")}/audio/speech`;
      if (opts.openaicompatibleApiKey) {
        headers["Authorization"] = `Bearer ${opts.openaicompatibleApiKey}`;
      }
    } else if (mode === "subscription") {
      url = "/api/ai/subscription/v1/audio/speech";
    } else {
      url = "/api/ai/openaicompatible/v1/audio/speech";
      if (opts.accessPassword) {
        headers["Authorization"] = `Bearer ${generateSignature(opts.accessPassword, Date.now())}`;
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "tts-1",
        input: word,
        voice,
        response_format: "mp3",
        speed,
      }),
    });

    if (!response.ok) {
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
      opts.onError?.(errorMsg);
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(audioBlob);

    await new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      audioRef.current = audio;
      audio.oncanplay = () => {
        audio
          .play()
          .then(resolve)
          .catch((err: unknown) => {
            const name = (err as { name?: string } | null)?.name;
            // Benign interruption (e.g. paused/aborted by a subsequent speak
            // or unmount): resolve silently, nothing to surface.
            if (name === "AbortError") {
              resolve();
              return;
            }
            // Autoplay policy rejection (iOS Safari / mobile Chrome): play()
            // was called outside a user gesture. Soft, expected failure — flag
            // it so the caller can prompt for a tap, and resolve cleanly.
            if (name === "NotAllowedError") {
              opts.onBlocked?.();
              resolve();
              return;
            }
            reject(err instanceof Error ? err : new Error("Audio playback failed"));
          });
      };
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        opts.onEnd?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        reject(new Error("Audio element error"));
      };
      audio.src = audioUrl;
      audio.load();
    });
  } catch (error) {
    opts.onError?.(error instanceof Error ? error.message : "TTS failed");
  } finally {
    opts.onEnd?.();
  }
}
