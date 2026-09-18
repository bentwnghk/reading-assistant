import { describe, expect, it } from "vitest";

import { enrichWords } from "./words";
import type { BattleWord } from "./types";

describe("enrichWords", () => {
  it("splits single words into character tiles for scramble", () => {
    const words: BattleWord[] = [{ word: "cat" }];
    const enriched = enrichWords(words, "scramble", "medium");
    const tiles = enriched[0]?.shuffledLetters ?? [];
    // Same characters as the word, just reordered.
    expect(tiles).toHaveLength(3);
    expect([...tiles].sort()).toEqual(["a", "c", "t"]);
  });

  it("splits phrases into whole-word tiles for scramble", () => {
    const words: BattleWord[] = [{ word: "take off" }];
    const enriched = enrichWords(words, "scramble", "medium");
    const tiles = enriched[0]?.shuffledLetters ?? [];
    // Two word-tiles, not 8 character tiles.
    expect(tiles).toHaveLength(2);
    expect([...tiles].sort()).toEqual(["off", "take"]);
  });

  it("splits hyphenated compounds into whole-word tiles for scramble", () => {
    const words: BattleWord[] = [{ word: "mother-in-law" }];
    const enriched = enrichWords(words, "scramble", "medium");
    const tiles = enriched[0]?.shuffledLetters ?? [];
    // Three word-tiles (mother, in, law), not 12 character tiles.
    expect(tiles).toHaveLength(3);
    expect([...tiles].sort()).toEqual(["in", "law", "mother"]);
  });

  it("splits mixed-separator entries (hyphens AND spaces) into whole-word tiles", () => {
    const words: BattleWord[] = [{ word: "once-in-a-lifetime experience" }];
    const enriched = enrichWords(words, "scramble", "medium");
    const tiles = enriched[0]?.shuffledLetters ?? [];
    // Five word-tiles (once, in, a, lifetime, experience).
    expect(tiles).toHaveLength(5);
    expect([...tiles].sort()).toEqual(["a", "experience", "in", "lifetime", "once"]);
  });

  it("lowercases phrase word-tiles", () => {
    const words: BattleWord[] = [{ word: "New York" }];
    const enriched = enrichWords(words, "scramble", "medium");
    const tiles = enriched[0]?.shuffledLetters ?? [];
    expect([...tiles].sort()).toEqual(["new", "york"]);
  });

  it("does not produce shuffle tiles for non-scramble modes", () => {
    const words: BattleWord[] = [{ word: "cat" }];
    const enriched = enrichWords(words, "listen-type", "medium");
    expect(enriched[0]?.shuffledLetters).toBeUndefined();
  });

  it("mixed mode may assign scramble to a phrase (word-tiles)", () => {
    // Run enough times that at least one word likely gets scramble. The key
    // assertion is that when scramble IS assigned, a phrase yields word-tiles.
    const phrase: BattleWord[] = [{ word: "take off" }];
    let sawScrambleWordTiles = false;
    for (let i = 0; i < 60; i++) {
      const enriched = enrichWords(phrase, "mixed", "medium");
      const w = enriched[0];
      if (w?.perWordMode === "scramble" && w.shuffledLetters) {
        expect(w.shuffledLetters).toHaveLength(2);
        sawScrambleWordTiles = true;
        break;
      }
    }
    // Mixed randomization might not pick scramble in 60 tries, but it's
    // overwhelmingly likely (>1 - (2/3)^60). If this flakes, re-run.
    expect(sawScrambleWordTiles).toBe(true);
  });

  it("fullBlank blanks every letter of a fill-blanks word", () => {
    const words: BattleWord[] = [{ word: "cat" }];
    const enriched = enrichWords(words, "fill-blanks", "medium", true);
    expect(enriched[0]?.blankPositions).toEqual([0, 1, 2]);
  });

  it("fullBlank is ignored without the flag (partial blanks)", () => {
    const words: BattleWord[] = [{ word: "cat" }];
    const enriched = enrichWords(words, "fill-blanks", "medium");
    // medium = 0.35 ratio → exactly 1 blank of 3 letters.
    expect(enriched[0]?.blankPositions).toHaveLength(1);
  });

  it("fullBlank produces no blanks for non-fill-blanks modes", () => {
    const words: BattleWord[] = [{ word: "cat" }];
    expect(enrichWords(words, "listen-type", "medium", true)[0]?.blankPositions).toBeUndefined();
    expect(enrichWords(words, "scramble", "medium", true)[0]?.blankPositions).toBeUndefined();
  });

  it("fullBlank in mixed mode applies only to fill-blanks words", () => {
    // Run enough times to observe both a fill-blanks and a non-fill-blanks
    // assignment; fullBlank must cover ALL positions when fill-blanks is
    // rolled and produce nothing otherwise.
    const words: BattleWord[] = [{ word: "cat" }];
    let sawFillBlanks = false;
    let sawOther = false;
    for (let i = 0; i < 60; i++) {
      const w = enrichWords(words, "mixed", "medium", true)[0];
      if (w?.perWordMode === "fill-blanks") {
        expect(w.blankPositions).toEqual([0, 1, 2]);
        sawFillBlanks = true;
      } else {
        expect(w?.blankPositions).toBeUndefined();
        sawOther = true;
      }
      if (sawFillBlanks && sawOther) break;
    }
    expect(sawFillBlanks).toBe(true);
    expect(sawOther).toBe(true);
  });
});
