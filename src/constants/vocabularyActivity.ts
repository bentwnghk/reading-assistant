/**
 * Canonical list of vocabulary-activity ledger event types (table
 * `vocabulary_activity_events`). Derive any Zod enum / TS union from this
 * array — never retype it as a literal.
 */
export const VOCABULARY_ACTIVITY_EVENT_TYPES = [
  "session_completed",
  "words_added",
] as const;

export type VocabularyActivityEventType =
  (typeof VOCABULARY_ACTIVITY_EVENT_TYPES)[number];

/** Time windows (days back, 0 = all time) of the staff analytics. */
export const VOCABULARY_ANALYTICS_RANGES = [0, 7, 30, 90] as const;

/** A learner with due words and no activity for this long needs a nudge. */
export const VOCABULARY_INACTIVE_DAYS = 14;

export const VOCABULARY_MASTERED_LEVEL = 5;
