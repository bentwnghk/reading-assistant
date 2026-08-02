/**
 * Shared per-session metric helpers for the score/accuracy columns shown across
 * the Sessions table (SessionsTab / History, client `ReadingHistory`) and the
 * Student Data table (`StudentSessionData`, server-precomputed).
 *
 * Unlike `calculateProgress` (a 15-step algorithm), most columns are direct
 * field reads that already agree across views. Only two pieces of logic are
 * genuinely duplicated and worth centralizing:
 *   - `grammarGameBestScore`: the max-of-5 derivation (client Math.max vs the
 *     server's precomputed `grammarGameBestScore` field).
 *   - `formatScore`: the "value > 0 ? show : dash" display rule, which had
 *     drifted (History rendered `0`/`0%`, the other tables rendered `-`).
 */

/** Shape carrying either a precomputed grammar-game best score or the 5 raw per-game scores. */
export interface GrammarGameScoreInput {
  /** Server-precomputed best score (StudentSessionData / TeacherSessionData). */
  grammarGameBestScore?: number;
  grammarScrambleHighScore?: number;
  grammarWorkshopHighScore?: number;
  grammarSurgeryHighScore?: number;
  grammarRouletteHighScore?: number;
  grammarDuelHighScore?: number;
}

/**
 * Best score across the 5 grammar games. Returns the precomputed
 * `grammarGameBestScore` when present (server-resolved), otherwise derives it
 * from the 5 raw per-game high scores. Returns 0 when none are set.
 */
export function grammarGameBestScore(session: GrammarGameScoreInput): number {
  if (typeof session.grammarGameBestScore === "number") {
    return session.grammarGameBestScore;
  }
  return Math.max(
    session.grammarScrambleHighScore || 0,
    session.grammarWorkshopHighScore || 0,
    session.grammarSurgeryHighScore || 0,
    session.grammarRouletteHighScore || 0,
    session.grammarDuelHighScore || 0,
  );
}

/**
 * Format a numeric score for table display: the value (with optional suffix)
 * when `value > 0`, otherwise `dash` (default "-"). Standardizes the
 * "shown vs dash" rule across the plain-text score tables.
 *
 * NOTE: not suitable for completion-gated columns where 0 is a legitimate
 * displayed result (e.g. a completed Reading Test scored 0%) — those keep
 * their explicit `completed && score !== undefined ? ... : "-"` condition.
 */
export function formatScore(
  value: number | null | undefined,
  suffix = "",
  dash = "-",
): string {
  return (value ?? 0) > 0 ? `${value}${suffix}` : dash;
}
