/**
 * Session-attribution for multiplayer spelling battles.
 *
 * Battle words come from the HOST's word source (their glossary, vocabulary
 * bank, review list, hand-picked selection) and may have nothing to do with
 * the reading session currently open on the invitee's client. Before a battle
 * is folded into that session (best score, spellingResults drill-down,
 * history persistence, activity-log sessionId), we test whether the battled
 * words actually belong to the session's text.
 *
 * A battled word "belongs" when it matches the session glossary OR occurs in
 * the session's extracted text, compared on a light symmetric stem so that
 * migrate/migrated, run/runs/running and class/classes collapse together.
 * The text-occurrence fallback makes same-text class battles match even when
 * each player's AI-generated glossary differs or hasn't been generated yet.
 *
 * Attribution rule (see SpellingBattleFlow's persistence effect):
 *   - n < 3 battled words: attributed only on a FULL match (small samples
 *     are statistically meaningless otherwise);
 *   - n >= 3: attributed when hits >= max(ceil(n/2), 3) — a majority with an
 *     absolute floor of 3 hits so that short battles can't pass on 2 lucky
 *     common-word collisions.
 *
 * The gate deliberately errs toward precision: a false positive writes
 * foreign data onto a teacher-facing session record, while a false negative
 * only omits a redundant record (the battle still lives in
 * vocabulary_review_sessions and activity_logs, which is what dashboards and
 * the leaderboard count spelling from).
 */

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Light symmetric stemmer. Not a linguistically correct lemmatizer — it only
 * needs to map inflected variants of the SAME word onto the same string on
 * BOTH sides of the comparison. Rules: ies→y; strip ing/ed/s (guarded by
 * length so bed/red/this survive); drop trailing silent-e; un-double a final
 * consonant (running→run, stopped→stop). Suffix stripping iterates so that
 * "springs" (→spring→spr) matches "spring" (→spr).
 */
function stem(word: string): string {
  let w = normalizeWord(word);
  if (w.length <= 3) return w;
  if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  for (let i = 0; i < 2; i++) {
    if (w.endsWith("ing") && w.length >= 6) w = w.slice(0, -3);
    else if (w.endsWith("ed") && w.length >= 5) w = w.slice(0, -2);
    else if (w.endsWith("s") && !w.endsWith("ss") && w.length >= 4) w = w.slice(0, -1);
    else break;
  }
  while (w.length > 3) {
    const last = w[w.length - 1];
    const second = w[w.length - 2];
    if (last === "e") {
      w = w.slice(0, -1);
      continue;
    }
    if (last === second && !VOWELS.has(last)) {
      w = w.slice(0, -1);
      continue;
    }
    break;
  }
  return w;
}

/** Stemmed token set of a raw text (letters only — hyphens/apostrophes split). */
function buildTextStems(text: string): Set<string> {
  const stems = new Set<string>();
  const tokens = text.toLowerCase().match(/[a-z]+/g);
  if (!tokens) return stems;
  for (const token of tokens) {
    const s = stem(token);
    if (s) stems.add(s);
  }
  return stems;
}

/**
 * Does one battled word/phrase belong to the session's material?
 * A phrase hits when EVERY letter-run token hits (hyphens/apostrophes split,
 * matching the text tokenizer; its content words decide — function words
 * occur in any text and pass trivially).
 */
function wordMatches(word: string, glossaryStems: Set<string>, textStems: Set<string> | null): boolean {
  const tokens = word.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return false;
  return tokens.every(
    (t) => glossaryStems.has(stem(t)) || (textStems !== null && textStems.has(stem(t))),
  );
}

export interface BattleSessionAttributionInput {
  /** Active reading session id (null/undefined when no session is open). */
  sessionId: string | null | undefined;
  /** Battled words/phrases, as recorded in the battle's per-word results. */
  battleWords: string[];
  /** Glossary word/phrase entries of the active session (may be empty). */
  glossaryWords: string[];
  /** Extracted text of the active session (occurrence fallback; may be empty). */
  extractedText?: string | null;
}

export interface BattleSessionAttribution {
  /** True when the battled words belong to the active reading session. */
  belongsToSession: boolean;
  /** 0–1 fraction of battled words matched (glossary or text occurrence). */
  overlap: number;
}

export function computeBattleSessionAttribution(
  input: BattleSessionAttributionInput,
): BattleSessionAttribution {
  const { sessionId, battleWords, glossaryWords, extractedText } = input;
  const n = battleWords.length;
  if (!sessionId || n === 0) return { belongsToSession: false, overlap: 0 };

  const glossaryStems = new Set(
    glossaryWords.map((w) => stem(w)).filter((s) => s.length > 0),
  );
  const textStems = extractedText ? buildTextStems(extractedText) : null;
  if (glossaryStems.size === 0 && (textStems === null || textStems.size === 0)) {
    return { belongsToSession: false, overlap: 0 };
  }

  const hits = battleWords.filter((w) => wordMatches(w, glossaryStems, textStems)).length;
  const overlap = hits / n;
  const threshold = n < 3 ? n : Math.max(Math.ceil(n / 2), 3);
  return { belongsToSession: hits >= threshold, overlap };
}
