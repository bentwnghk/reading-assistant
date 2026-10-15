import { describe, expect, it } from "vitest";

import {
  TTS_MODEL_RESPONSE_FORMATS,
  isPromptStyleGeminiTtsModel,
} from "@/store/setting";
import { frameTtsInput, isWavResponse, normalizeHyphensForTts } from "./tts";

describe("normalizeHyphensForTts", () => {
  it("splits hyphenated compounds grok would read as 'dash'", () => {
    expect(normalizeHyphensForTts("carbon-neutral")).toBe("carbon neutral");
    expect(normalizeHyphensForTts("chart-topper")).toBe("chart topper");
  });

  it("is pronunciation-identical for compounds that already worked", () => {
    expect(normalizeHyphensForTts("bad-tempered")).toBe("bad tempered");
    expect(normalizeHyphensForTts("co-founders")).toBe("co founders");
    expect(normalizeHyphensForTts("cost-effective")).toBe("cost effective");
  });

  it("handles chained and doubled hyphens", () => {
    expect(normalizeHyphensForTts("state-of-the-art")).toBe("state of the art");
    expect(normalizeHyphensForTts("well--known")).toBe("well known");
  });

  it("normalizes hyphenated compounds inside larger text (read-along sentences)", () => {
    expect(normalizeHyphensForTts("a carbon-neutral policy worked well")).toBe(
      "a carbon neutral policy worked well"
    );
  });

  it("leaves non-word hyphens untouched", () => {
    expect(normalizeHyphensForTts("1990-1995")).toBe("1990-1995");
    expect(normalizeHyphensForTts("pages 10-15")).toBe("pages 10-15");
    expect(normalizeHyphensForTts("word - word")).toBe("word - word");
    expect(normalizeHyphensForTts("a — b")).toBe("a — b");
    expect(normalizeHyphensForTts("plain")).toBe("plain");
    expect(normalizeHyphensForTts("")).toBe("");
  });

  it("covers accented letters", () => {
    expect(normalizeHyphensForTts("café-au-lait")).toBe("café au lait");
  });
});

describe("isPromptStyleGeminiTtsModel", () => {
  it("classifies legacy preview-era Gemini TTS models as prompt-style", () => {
    expect(isPromptStyleGeminiTtsModel("gemini-3.1-flash-tts-preview")).toBe(true);
    // Google's other legacy naming variant puts "preview" mid-id.
    expect(isPromptStyleGeminiTtsModel("gemini-2.5-flash-preview-tts")).toBe(true);
  });

  it("classifies Gemini 3.8 TTS (verbatim-transcript) models as NOT prompt-style", () => {
    expect(isPromptStyleGeminiTtsModel("gemini-3.8-flash-lite-tts")).toBe(false);
    expect(isPromptStyleGeminiTtsModel("gemini-3.8-flash-tts")).toBe(false);
  });

  it("classifies non-Gemini models as NOT prompt-style", () => {
    expect(isPromptStyleGeminiTtsModel("tts-1")).toBe(false);
    expect(isPromptStyleGeminiTtsModel("x-ai/grok-voice-tts-1.0")).toBe(false);
  });
});

describe("frameTtsInput", () => {
  it("passes text through verbatim for Gemini 3.8 TTS models", () => {
    // Regression test: Gemini 3.8 TTS treats input strictly as a verbatim
    // transcript and READS EMBEDDED STAGE DIRECTIONS ALOUD — framing made
    // gemini-3.8-flash-lite-tts speak "Say the following text..." before
    // every word. The transcript must go through untouched.
    expect(frameTtsInput("gemini-3.8-flash-lite-tts", "antagonist")).toBe("antagonist");
    expect(frameTtsInput("gemini-3.8-flash-lite-tts", 'He said "hello" loudly.')).toBe(
      'He said "hello" loudly.'
    );
  });

  it("passes text through verbatim for non-Gemini models", () => {
    expect(frameTtsInput("tts-1", "antagonist")).toBe("antagonist");
    expect(frameTtsInput("x-ai/grok-voice-tts-1.0", 'Say "hi"')).toBe('Say "hi"');
  });

  it("wraps input with the recitation prefix only for legacy prompt-style models", () => {
    const framed = frameTtsInput("gemini-3.1-flash-tts-preview", "antagonist");
    expect(framed.startsWith("Say the following text")).toBe(true);
    expect(framed.endsWith(': "antagonist"')).toBe(true);
  });

  it("normalizes inner double quotes only on the framed path", () => {
    expect(frameTtsInput("gemini-3.1-flash-tts-preview", 'He said "hi"')).toBe(
      'Say the following text exactly as written, word for word, in a neutral and clear tone: "He said \'hi\'"'
    );
  });
});

describe("TTS_MODEL_RESPONSE_FORMATS", () => {
  it("requests pcm for Gemini 3.8 TTS", () => {
    // Regression test: requesting "wav" for gemini-3.8-flash-lite-tts fails
    // with HTTP 400 — the OpenAI-compatible audio/speech endpoint only
    // accepts the classic response_format values (pcm/mp3). The trailing
    // cracking noise that motivated the "wav" attempt is instead fixed by
    // container-aware decoding of the pcm body (see isWavResponse).
    expect(TTS_MODEL_RESPONSE_FORMATS["gemini-3.8-flash-lite-tts"]).toBe("pcm");
  });

  it("keeps mp3 for the container-native models", () => {
    expect(TTS_MODEL_RESPONSE_FORMATS["tts-1"]).toBe("mp3");
    expect(TTS_MODEL_RESPONSE_FORMATS["x-ai/grok-voice-tts-1.0"]).toBe("mp3");
  });
});

/** Builds a minimal RIFF/WAVE body: fmt (PCM 16-bit mono 24kHz) + a small
 *  data chunk, plus (optionally) a trailing LIST metadata chunk that must
 *  never be played as samples. */
function buildWavBody(trailingJunk: boolean): ArrayBuffer {
  const dataSamples = 4;
  const dataBytes = dataSamples * 2;
  const listPayload = 64;
  const fmtChunk = 8 + 16;
  const dataChunk = 8 + dataBytes;
  const listChunk = trailingJunk ? 8 + listPayload : 0;
  const riffSize = 4 + fmtChunk + dataChunk + listChunk;
  const buf = new ArrayBuffer(8 + riffSize);
  const v = new DataView(buf);
  const ascii = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  v.setUint32(4, riffSize, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM format
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, 24000, true); // sample rate
  v.setUint32(28, 24000 * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  v.setUint32(40, dataBytes, true);
  for (let i = 0; i < dataSamples; i++) v.setInt16(42 + i * 2, i * 100, true);
  if (trailingJunk) {
    const off = 42 + dataBytes;
    ascii(off, "LIST");
    v.setUint32(off + 4, listPayload, true);
    for (let i = 0; i < listPayload; i++) v.setUint8(off + 8 + i, 0xab);
  }
  return buf;
}

describe("isWavResponse", () => {
  it("detects a RIFF/WAVE container, including one with trailing metadata chunks", () => {
    expect(isWavResponse(buildWavBody(true))).toBe(true);
    expect(isWavResponse(buildWavBody(false))).toBe(true);
  });

  it("does not misclassify clean headerless PCM", () => {
    const pcm = new ArrayBuffer(4800);
    new DataView(pcm).setInt16(0, 1234, true);
    expect(isWavResponse(pcm)).toBe(false);
  });

  it("tolerates short or truncated bodies", () => {
    expect(isWavResponse(new ArrayBuffer(0))).toBe(false);
    expect(isWavResponse(new ArrayBuffer(8))).toBe(false);
  });

  it("rejects non-WAVE RIFF payloads (e.g. WebP)", () => {
    const riff = new ArrayBuffer(16);
    const v = new DataView(riff);
    for (let i = 0; i < 4; i++) v.setUint8(i, "RIFF".charCodeAt(i));
    for (let i = 0; i < 4; i++) v.setUint8(8 + i, "WEBP".charCodeAt(i));
    expect(isWavResponse(riff)).toBe(false);
  });
});
