/**
 * Word-list resolution for a battle room.
 *
 * Fetches words from one of three sources (all host-ownership-checked),
 * shuffles, and caps to the requested count. The resolved list is stored
 * canonically on the room and hidden from clients until each word is emitted.
 *
 * Sources:
 *   - glossary:     reading_sessions.glossary (host-owned)
 *   - vocabulary:   user_vocabulary (host's bank, optional filter)
 *   - review-list:  review_lists.words (host-owned)
 */
import { getPool } from "../db";
import type { BattleGameMode, BattleWord, SpellingDifficulty, VocabularyFilter, WordSource } from "./types";

// ── DB-backed sources ────────────────────────────────────────────────────────

interface GlossaryRow {
  glossary: unknown;
}

async function fetchGlossary(hostUserId: string, sourceId: string | undefined): Promise<BattleWord[]> {
  if (!sourceId) throw new Error("glossary source requires a session id");
  const pool = getPool();
  const result = await pool.query<GlossaryRow>(
    `SELECT glossary FROM reading_sessions WHERE id = $1 AND user_id = $2`,
    [sourceId, hostUserId],
  );
  if (result.rows.length === 0) throw new Error("glossary session not found or not owned by host");
  const entries = result.rows[0].glossary;
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null && typeof (e as { word?: unknown }).word === "string")
    .map((e) => ({
      word: String(e.word),
      englishDefinition: typeof e.englishDefinition === "string" ? e.englishDefinition : undefined,
      chineseDefinition: typeof e.chineseDefinition === "string" ? e.chineseDefinition : undefined,
      syllabification: typeof e.syllabification === "string" ? e.syllabification : undefined,
      partOfSpeech: typeof e.partOfSpeech === "string" ? e.partOfSpeech : undefined,
      example: typeof e.example === "string" ? e.example : undefined,
    }));
}

interface VocabularyRow {
  word: string;
  syllabification: string | null;
  part_of_speech: string | null;
  english_definition: string | null;
  chinese_definition: string | null;
  example: string | null;
}

async function fetchVocabulary(hostUserId: string, filter: VocabularyFilter, requestedCount: number): Promise<BattleWord[]> {
  const pool = getPool();
  const now = Date.now();
  let query = `SELECT word, syllabification, part_of_speech, english_definition, chinese_definition, example
               FROM user_vocabulary WHERE user_id = $1`;
  const params: unknown[] = [hostUserId];

  // Strategy filters — mirror the My Vocabulary "Auto Select" strategies
  // (src/store/vocabulary.ts `autoSelectForReview`).
  if (filter === "due") {
    query += ` AND (next_review_at = 0 OR next_review_at <= $2)`;
    params.push(now);
  } else if (filter === "hardest") {
    query += ` AND rating = 'hard'`;
  } else if (filter === "newest") {
    query += ` AND mastery_level = 0 AND review_count = 0`;
  } else if (filter === "weakest") {
    query += ` AND review_count > 0`;
  }
  // "all" and "random" → no extra filter.

  // Order so the "most <strategy>" words surface first. For the priority
  // strategies we then cap the candidate pool to requestedCount*3 (matching the
  // store's algorithm) so the strategy actually biases the final selection —
  // resolveWordList shuffles this pool and picks the final requestedCount.
  // "all" and "random" return the full bank (resolveWordList shuffles it).
  switch (filter) {
    case "due":
      query += ` ORDER BY next_review_at ASC`;
      break;
    case "hardest":
      query += ` ORDER BY mastery_level ASC`;
      break;
    case "newest":
      query += ` ORDER BY created_at DESC`;
      break;
    case "weakest":
      // Lowest accuracy first (correct_count / review_count asc). Words with no
      // reviews are excluded by the filter above, so NULLIF isn't needed here.
      query += ` ORDER BY (correct_count::float / review_count) ASC`;
      break;
    default:
      query += ` ORDER BY word`;
  }

  const isPriorityStrategy =
    filter === "due" || filter === "hardest" || filter === "newest" || filter === "weakest";
  if (isPriorityStrategy) {
    const candidateCap = Math.max(1, requestedCount * 3);
    params.push(candidateCap);
    query += ` LIMIT $${params.length}`;
  }

  const result = await pool.query<VocabularyRow>(query, params);
  return result.rows.map((r) => ({
    word: r.word,
    englishDefinition: r.english_definition || undefined,
    chineseDefinition: r.chinese_definition || undefined,
    syllabification: r.syllabification || undefined,
    partOfSpeech: r.part_of_speech || undefined,
    example: r.example || undefined,
  }));
}

interface ReviewListRow {
  words: unknown;
}

async function fetchReviewList(hostUserId: string, sourceId: string | undefined): Promise<BattleWord[]> {
  if (!sourceId) throw new Error("review-list source requires a list id");
  const pool = getPool();
  const result = await pool.query<ReviewListRow>(
    `SELECT words FROM review_lists WHERE id = $1 AND created_by = $2`,
    [sourceId, hostUserId],
  );
  if (result.rows.length === 0) throw new Error("review list not found or not owned by host");
  const words = result.rows[0].words;
  if (!Array.isArray(words)) return [];
  return words
    .filter((w): w is Record<string, unknown> => typeof w === "object" && w !== null && typeof (w as { word?: unknown }).word === "string")
    .map((w) => ({
      word: String(w.word),
      englishDefinition: typeof w.englishDefinition === "string" ? w.englishDefinition : undefined,
      chineseDefinition: typeof w.chineseDefinition === "string" ? w.chineseDefinition : undefined,
      syllabification: typeof w.syllabification === "string" ? w.syllabification : undefined,
      partOfSpeech: typeof w.partOfSpeech === "string" ? w.partOfSpeech : undefined,
      example: typeof w.example === "string" ? w.example : undefined,
    }));
}

async function fetchSelectedWords(hostUserId: string, words: string[] | undefined): Promise<BattleWord[]> {
  if (!words || words.length === 0) throw new Error("selected source requires a non-empty words array");
  const pool = getPool();
  const result = await pool.query<VocabularyRow>(
    `SELECT word, syllabification, part_of_speech, english_definition, chinese_definition, example
     FROM user_vocabulary WHERE user_id = $1 AND word = ANY($2::text[])`,
    [hostUserId, words],
  );
  return result.rows.map((r) => ({
    word: r.word,
    englishDefinition: r.english_definition || undefined,
    chineseDefinition: r.chinese_definition || undefined,
    syllabification: r.syllabification || undefined,
    partOfSpeech: r.part_of_speech || undefined,
    example: r.example || undefined,
  }));
}

// ── Public API ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── Mode-specific challenge precomputation ───────────────────────────────────

/** Fraction of letters blanked in fill-blanks, by difficulty (matches solo game). */
const BLANK_RATIO: Record<SpellingDifficulty, number> = {
  easy: 0.2,
  medium: 0.35,
  hard: 0.5,
};

/** The three base modes "mixed" randomly picks from per word. */
const BASE_MODES: BattleGameMode[] = ["listen-type", "scramble", "fill-blanks"];

function computeBlankPositions(word: string, blankRatio: number): number[] {
  const len = word.length;
  if (len === 0) return [];
  const blankCount = Math.max(1, Math.floor(len * blankRatio));
  return shuffle([...Array(len).keys()]).slice(0, blankCount).sort((a, b) => a - b);
}

function computeShuffledLetters(word: string): string[] {
  // Multi-unit entries (containing spaces OR hyphens) scramble by whole-word
  // tiles so they stay solvable; single words scramble by character. Hyphens
  // are treated as separators alongside whitespace, so "mother-in-law" yields
  // 3 word-tiles ["mother","in","law"] rather than 12 character tiles.
  // Mirrors the solo game's generateChallenge in VocabularySpelling.tsx.
  const lower = word.toLowerCase();
  const trimmed = lower.trim();
  return /[\s-]/.test(trimmed)
    ? shuffle(trimmed.split(/[\s-]+/))
    : shuffle(trimmed.split(""));
}

/**
 * Precompute the mode-specific challenge data for each canonical word so the
 * server judges authoritatively and every player sees identical blanks/tiles.
 * Stored on `room.canonicalWords`; consumed by the engine in startWord/submitAnswer.
 */
export function enrichWords(
  words: BattleWord[],
  gameMode: BattleGameMode,
  difficulty: SpellingDifficulty,
): BattleWord[] {
  const blankRatio = BLANK_RATIO[difficulty];
  return words.map((w) => {
    const perWordMode: BattleGameMode =
      gameMode === "mixed" ? BASE_MODES[Math.floor(Math.random() * BASE_MODES.length)] : gameMode;
    const enriched: BattleWord = { ...w, perWordMode };
    if (perWordMode === "fill-blanks") {
      enriched.blankPositions = computeBlankPositions(w.word, blankRatio);
    } else if (perWordMode === "scramble") {
      enriched.shuffledLetters = computeShuffledLetters(w.word);
    }
    return enriched;
  });
}

export interface ResolvedWordList {
  words: BattleWord[];
  actualCount: number;
}

/** Resolve, shuffle, and cap a word list for a room. Throws on invalid source. */
export async function resolveWordList(
  hostUserId: string,
  source: WordSource,
  requestedCount: number,
): Promise<ResolvedWordList> {
  let raw: BattleWord[];
  switch (source.type) {
    case "glossary":
      raw = await fetchGlossary(hostUserId, source.sourceId);
      break;
    case "vocabulary":
      raw = await fetchVocabulary(hostUserId, source.filter ?? "all", requestedCount);
      break;
    case "review-list":
      raw = await fetchReviewList(hostUserId, source.sourceId);
      break;
    case "selected":
      raw = await fetchSelectedWords(hostUserId, source.words);
      break;
    default:
      throw new Error(`unknown word source type: ${(source as { type: string }).type}`);
  }
  const cap = Math.max(1, Math.min(requestedCount, raw.length));
  const words = shuffle(raw).slice(0, cap);
  return { words, actualCount: words.length };
}
