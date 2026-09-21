import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the DB pool so resolveWordList can be tested without a database.
// enrichWords (the other export under test) never touches the pool.
const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));
vi.mock("../db", () => ({ getPool: () => ({ query: mockQuery }) }));

import { enrichWords, resolveWordList, NotEnoughWordsError, MIN_BATTLE_WORDS } from "./words";
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

// user_vocabulary-shaped rows returned by the mocked pool for the
// "vocabulary" word source.
function vocabRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    word: `word${i}`,
    syllabification: null,
    part_of_speech: null,
    english_definition: null,
    chinese_definition: null,
    example: null,
  }));
}

describe("resolveWordList minimum word count", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("throws NotEnoughWordsError when the source has fewer than MIN_BATTLE_WORDS words", async () => {
    mockQuery.mockResolvedValue({ rows: vocabRows(MIN_BATTLE_WORDS - 1) });
    await expect(
      resolveWordList("user-1", { type: "vocabulary", filter: "random" }, 30),
    ).rejects.toBeInstanceOf(NotEnoughWordsError);
  });

  it("rejects a sub-minimum requested word count even with a large source (server is the law)", async () => {
    mockQuery.mockResolvedValue({ rows: vocabRows(30) });
    await expect(
      resolveWordList("user-1", { type: "vocabulary", filter: "random" }, MIN_BATTLE_WORDS - 1),
    ).rejects.toBeInstanceOf(NotEnoughWordsError);
  });

  it("resolves a large source capped to the requested count", async () => {
    mockQuery.mockResolvedValue({ rows: vocabRows(30) });
    const result = await resolveWordList("user-1", { type: "vocabulary", filter: "random" }, MIN_BATTLE_WORDS);
    expect(result.actualCount).toBe(MIN_BATTLE_WORDS);
    expect(result.words).toHaveLength(MIN_BATTLE_WORDS);
  });

  it("resolves an oversized source capped by requestedCount when above the minimum", async () => {
    mockQuery.mockResolvedValue({ rows: vocabRows(MIN_BATTLE_WORDS + 2) });
    const result = await resolveWordList("user-1", { type: "vocabulary", filter: "random" }, 30);
    expect(result.actualCount).toBe(MIN_BATTLE_WORDS + 2);
  });
});
