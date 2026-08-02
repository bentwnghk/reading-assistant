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
});
