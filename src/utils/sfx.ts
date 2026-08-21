/**
 * Game sound effects (SFX) — synthesized with Web Audio oscillators, no audio
 * assets required.
 *
 * Reuses the single app-lifetime AudioContext owned by `src/utils/tts.ts`
 * (see `getSharedAudioContext`). That context is gesture-unlocked once (iOS
 * Safari autoplay policy) and then serves BOTH TTS playback and these short
 * effect envelopes. SFX create their own OscillatorNode + GainNode chains and
 * never touch tts.ts's `currentSource`, so TTS playback is unaffected.
 *
 * Gating:
 *   - Skips silently when the shared context is missing or not "running"
 *     (never forces an unlock — effects only play once audio is available).
 *   - Skips when the user turned game sound effects off in Settings.
 *   - The "tick" effect additionally skips while TTS is speaking so the
 *     spoken word stays intelligible during the final countdown seconds.
 */
import { getSharedAudioContext, isSpeaking } from "@/utils/tts";
import { useSettingStore } from "@/store/setting";

export type SfxName =
  | "correct"
  | "wrong"
  | "streak"
  | "tick"
  | "overtaken"
  | "newBest"
  | "countdown";

interface ToneSpec {
  /** Start frequency (Hz). */
  freq: number;
  /** Optional end frequency for a pitch sweep (Hz). */
  endFreq?: number;
  /** Offset from the effect's start time (ms). */
  at: number;
  /** Tone duration (ms). */
  duration: number;
  type: OscillatorType;
  /** Peak gain (0..1) — already scaled by the master volume. */
  gain: number;
}

/** Master volume for all game SFX — deliberately subtle. */
const MASTER_GAIN = 0.18;

const SFX: Record<SfxName, ToneSpec[]> = {
  // Ascending major third — bright "ding".
  correct: [
    { freq: 523.25, at: 0, duration: 90, type: "sine", gain: 0.9 },
    { freq: 783.99, at: 80, duration: 140, type: "sine", gain: 0.9 },
  ],
  // Low descending thud.
  wrong: [
    { freq: 200, endFreq: 90, at: 0, duration: 220, type: "triangle", gain: 0.9 },
  ],
  // Ascending arpeggio C5-E5-G5-C6 — streak fanfare.
  streak: [
    { freq: 523.25, at: 0, duration: 80, type: "sine", gain: 0.8 },
    { freq: 659.25, at: 70, duration: 80, type: "sine", gain: 0.8 },
    { freq: 783.99, at: 140, duration: 80, type: "sine", gain: 0.8 },
    { freq: 1046.5, at: 210, duration: 180, type: "sine", gain: 0.9 },
  ],
  // Very short, quiet blip for the countdown's final seconds.
  tick: [{ freq: 1000, at: 0, duration: 35, type: "square", gain: 0.25 }],
  // Descending whoosh — someone overtook you on the leaderboard.
  overtaken: [
    { freq: 600, endFreq: 180, at: 0, duration: 280, type: "sawtooth", gain: 0.35 },
  ],
  // Fanfare G4-C5-E5-G5 (final note held) — new personal best.
  newBest: [
    { freq: 392.0, at: 0, duration: 110, type: "sine", gain: 0.85 },
    { freq: 523.25, at: 100, duration: 110, type: "sine", gain: 0.85 },
    { freq: 659.25, at: 200, duration: 110, type: "sine", gain: 0.85 },
    { freq: 783.99, at: 300, duration: 320, type: "sine", gain: 0.95 },
  ],
  // Single mid blip — pre-game countdown numbers.
  countdown: [{ freq: 660, at: 0, duration: 120, type: "sine", gain: 0.8 }],
};

export function playSfx(name: SfxName): void {
  if (!useSettingStore.getState().gameSoundEffects) return;

  const ctx = getSharedAudioContext();
  // Not unlocked (iOS pre-gesture / unsupported) — skip silently. Never call
  // ctx.resume() from here: SFX are decorative and must not consume/steal the
  // user-gesture unlock that TTS relies on.
  if (!ctx || ctx.state !== "running") return;

  // Keep the final-seconds tick out of the spoken word (listen-type mode).
  if (name === "tick" && isSpeaking()) return;

  const base = ctx.currentTime;
  for (const tone of SFX[name]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    const startAt = base + tone.at / 1000;
    const endAt = startAt + tone.duration / 1000;
    osc.frequency.setValueAtTime(tone.freq, startAt);
    if (tone.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(tone.endFreq, endAt);
    }
    // Short attack + linear release envelope avoids clicks.
    const peak = tone.gain * MASTER_GAIN;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(peak, startAt + 0.01);
    gain.gain.setValueAtTime(peak, Math.max(startAt + 0.01, endAt - 0.03));
    gain.gain.linearRampToValueAtTime(0.0001, endAt);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(endAt + 0.02);
  }
}
