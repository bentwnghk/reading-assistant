import { describe, expect, it } from "vitest";

import { normalizeHyphensForTts } from "./tts";

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
