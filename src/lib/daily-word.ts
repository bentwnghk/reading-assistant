import { getPool } from "./db";
import {
  DAILY_WORD_MAX_AHEAD_DAYS,
  DAILY_WORD_MAX_NOTE,
  type DailyWordImageKind,
} from "@/constants/dailyWord";

const DAY_MS = 86_400_000;

export interface DailyWordDay {
  word: string;
  learnedAt: number | null;
  onTime: boolean;
  note: string;
}

export type DailyWordDays = Record<string, DailyWordDay>;

export function wordKeyOf(word: string): string {
  return word.trim().toLowerCase();
}

function dayKeyToUtcDay(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : Math.floor(t / DAY_MS);
}

/**
 * The client sends its LOCAL calendar day (timezones span UTC-12..UTC+14), so
 * a legitimate "today" is always within one day of the UTC date. Anything
 * further away can never be "learned on time" — this stops a tampered client
 * from backdating learned days to fake a streak.
 */
export function isPlausibleToday(dayKey: string, now = Date.now()): boolean {
  const d = dayKeyToUtcDay(dayKey);
  if (d === null) return false;
  return Math.abs(d - Math.floor(now / DAY_MS)) <= 1;
}

/** Days a user may pin/learn: not in the future beyond the preview window. */
export function isDayInRange(dayKey: string, now = Date.now()): boolean {
  const d = dayKeyToUtcDay(dayKey);
  if (d === null) return false;
  const today = Math.floor(now / DAY_MS);
  return d <= today + 1 + DAILY_WORD_MAX_AHEAD_DAYS && d >= today - 800;
}

export async function userHasWord(userId: string, word: string): Promise<boolean> {
  const r = await getPool().query(
    `SELECT 1 FROM user_vocabulary WHERE user_id = $1 AND LOWER(word) = $2 LIMIT 1`,
    [userId, wordKeyOf(word)]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function getDailyWordDays(userId: string): Promise<DailyWordDays> {
  const r = await getPool().query(
    `SELECT day_key, word, learned_at, on_time, note
       FROM daily_word_progress
      WHERE user_id = $1
      ORDER BY day_key DESC
      LIMIT 900`,
    [userId]
  );
  const out: DailyWordDays = {};
  for (const row of r.rows) {
    out[row.day_key] = {
      word: row.word,
      learnedAt: row.learned_at === null ? null : Number(row.learned_at),
      onTime: row.on_time,
      note: row.note,
    };
  }
  return out;
}

/** First writer wins, so every device agrees on a day's word. */
export async function pinDailyWord(
  userId: string,
  dayKey: string,
  word: string
): Promise<DailyWordDay> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO daily_word_progress (user_id, day_key, word, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, day_key) DO NOTHING`,
    [userId, dayKey, word, Date.now()]
  );
  const r = await pool.query(
    `SELECT word, learned_at, on_time, note FROM daily_word_progress
      WHERE user_id = $1 AND day_key = $2`,
    [userId, dayKey]
  );
  const row = r.rows[0];
  return {
    word: row.word,
    learnedAt: row.learned_at === null ? null : Number(row.learned_at),
    onTime: row.on_time,
    note: row.note,
  };
}

/** Idempotent: a day already learned keeps its original timestamp/on_time. */
export async function markDailyWordLearned(
  userId: string,
  dayKey: string,
  word: string,
  claimedOnTime: boolean
): Promise<DailyWordDay> {
  const onTime = claimedOnTime && isPlausibleToday(dayKey);
  const now = Date.now();
  const pool = getPool();
  await pool.query(
    `INSERT INTO daily_word_progress (user_id, day_key, word, learned_at, on_time, updated_at)
     VALUES ($1, $2, $3, $4, $5, $4)
     ON CONFLICT (user_id, day_key) DO UPDATE
        SET learned_at = COALESCE(daily_word_progress.learned_at, EXCLUDED.learned_at),
            on_time    = CASE WHEN daily_word_progress.learned_at IS NULL
                              THEN EXCLUDED.on_time ELSE daily_word_progress.on_time END,
            updated_at = EXCLUDED.updated_at`,
    [userId, dayKey, word, now, onTime]
  );
  const r = await pool.query(
    `SELECT word, learned_at, on_time, note FROM daily_word_progress
      WHERE user_id = $1 AND day_key = $2`,
    [userId, dayKey]
  );
  const row = r.rows[0];
  return {
    word: row.word,
    learnedAt: Number(row.learned_at),
    onTime: row.on_time,
    note: row.note,
  };
}

export async function setDailyWordNote(
  userId: string,
  dayKey: string,
  word: string,
  note: string
): Promise<void> {
  await getPool().query(
    `INSERT INTO daily_word_progress (user_id, day_key, word, note, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, day_key) DO UPDATE
        SET note = EXCLUDED.note, updated_at = EXCLUDED.updated_at`,
    [userId, dayKey, word, note.slice(0, DAILY_WORD_MAX_NOTE), Date.now()]
  );
}

export async function getDailyWordContent(
  userId: string,
  word: string
): Promise<{
  content: unknown | null;
  images: Partial<Record<DailyWordImageKind, string>>;
}> {
  const pool = getPool();
  const key = wordKeyOf(word);
  const [c, i] = await Promise.all([
    pool.query(
      `SELECT content FROM daily_word_content WHERE user_id = $1 AND word_key = $2`,
      [userId, key]
    ),
    pool.query(
      `SELECT kind, image FROM daily_word_images WHERE user_id = $1 AND word_key = $2`,
      [userId, key]
    ),
  ]);
  const images: Partial<Record<DailyWordImageKind, string>> = {};
  for (const row of i.rows) images[row.kind as DailyWordImageKind] = row.image;
  return { content: c.rows[0]?.content ?? null, images };
}

/** First writer wins; always returns the stored content. */
export async function saveDailyWordContent(
  userId: string,
  word: string,
  content: unknown
): Promise<unknown> {
  const pool = getPool();
  const key = wordKeyOf(word);
  await pool.query(
    `INSERT INTO daily_word_content (user_id, word_key, content, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, word_key) DO NOTHING`,
    [userId, key, JSON.stringify(content), Date.now()]
  );
  const r = await pool.query(
    `SELECT content FROM daily_word_content WHERE user_id = $1 AND word_key = $2`,
    [userId, key]
  );
  return r.rows[0].content;
}

export async function getDailyWordImage(
  userId: string,
  word: string,
  kind: DailyWordImageKind
): Promise<string | null> {
  const r = await getPool().query(
    `SELECT image FROM daily_word_images WHERE user_id = $1 AND word_key = $2 AND kind = $3`,
    [userId, wordKeyOf(word), kind]
  );
  return r.rows[0]?.image ?? null;
}

/** First writer wins; returns the stored image. */
export async function saveDailyWordImage(
  userId: string,
  word: string,
  kind: DailyWordImageKind,
  image: string
): Promise<string> {
  const pool = getPool();
  const key = wordKeyOf(word);
  await pool.query(
    `INSERT INTO daily_word_images (user_id, word_key, kind, image, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, word_key, kind) DO NOTHING`,
    [userId, key, kind, image, Date.now()]
  );
  const r = await pool.query(
    `SELECT image FROM daily_word_images WHERE user_id = $1 AND word_key = $2 AND kind = $3`,
    [userId, key, kind]
  );
  return r.rows[0].image;
}

/** Images generated by the user since 00:00 UTC (drives the daily cap). */
export async function countDailyWordImagesToday(userId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const r = await getPool().query(
    `SELECT COUNT(*)::int AS cnt FROM daily_word_images
      WHERE user_id = $1 AND created_at >= $2`,
    [userId, start.getTime()]
  );
  return r.rows[0]?.cnt ?? 0;
}
