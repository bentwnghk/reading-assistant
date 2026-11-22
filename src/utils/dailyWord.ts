export const DAILY_WORD_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

const DAY_MS = 86_400_000;

/** Local calendar day key, `YYYY-MM-DD`. */
export function dayKeyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Day key `offset` calendar days away from `key` (DST-safe). */
export function shiftDayKey(key: string, offset: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + offset);
  return dayKeyOf(d);
}

/** Whole calendar days from `fromKey` to `toKey` (positive = later). */
export function diffDays(fromKey: string, toKey: string): number {
  const a = parseDayKey(fromKey);
  const b = parseDayKey(toKey);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      DAY_MS
  );
}

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function dayNumber(key: string): number {
  const d = parseDayKey(key);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

export interface DailyCandidate {
  word: string;
}

/**
 * Deterministic word for a day. Words are put in a stable pseudo-random order
 * (hash of the word, independent of list order) and walked one per day, so no
 * word repeats until the whole bank has been shown.
 */
export function pickDailyWord<T extends DailyCandidate>(
  candidates: T[],
  key: string
): T | null {
  if (candidates.length === 0) return null;
  const ordered = [...candidates].sort((a, b) => {
    const ha = fnv1a(a.word.toLowerCase());
    const hb = fnv1a(b.word.toLowerCase());
    return ha - hb || a.word.localeCompare(b.word);
  });
  const n = ordered.length;
  return ordered[((dayNumber(key) % n) + n) % n];
}

export interface StreakInfo {
  current: number;
  best: number;
}

/**
 * Streaks only count days learned ON that day (`onTimeKeys`), so catching up
 * on past days or studying ahead cannot inflate them. The current streak
 * stays alive through today if today is not learned yet.
 */
export function computeStreak(onTimeKeys: string[], todayKey: string): StreakInfo {
  const set = new Set(onTimeKeys);
  let current = 0;
  let cursor = set.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  while (set.has(cursor)) {
    current++;
    cursor = shiftDayKey(cursor, -1);
  }
  const days = [...set].map(dayNumber).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] - days[i - 1] === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best: Math.max(best, current) };
}

export function milestoneReached(streak: number): number | null {
  return (DAILY_WORD_MILESTONES as readonly number[]).includes(streak)
    ? streak
    : null;
}
