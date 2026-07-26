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
        audio.play().then(resolve).catch(reject);
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
