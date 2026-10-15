import { describe, expect, it } from "vitest";

import { isPromptStyleGeminiTtsModel } from "@/store/setting";
import { frameTtsInput, normalizeHyphensForTts } from "./tts";

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
