import { z } from "zod";
import {
  LANGUAGE_CHECK_CATEGORIES,
  LANGUAGE_CHECK_MAX_ALTERNATIVES,
  isExpressionCategory,
} from "@/constants/languageCheck";

// ─── Paragraphs ──────────────────────────────────────────────────────────────

export interface ParagraphSpan {
  /** 1-based index among non-empty paragraphs (what the AI refers to). */
  index: number;
  text: string;
  /** Offsets into the full text: [start, end). */
  start: number;
  end: number;
}

/** Splits on blank lines; returns only non-empty paragraphs with offsets. */
export function splitParagraphs(text: string): ParagraphSpan[] {
  const result: ParagraphSpan[] = [];
  const re = /\n[ \t]*\n+/g;
  let last = 0;
  let index = 0;
  const push = (from: number, to: number) => {
    const raw = text.slice(from, to);
    if (!raw.trim()) return;
    index += 1;
    result.push({ index, text: raw, start: from, end: to });
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    push(last, m.index);
    last = m.index + m[0].length;
  }
  push(last, text.length);
  return result;
}

/** Groups paragraphs into chunks of roughly `maxWords` words (never splits a paragraph). */
export function chunkParagraphs(
  paragraphs: ParagraphSpan[],
  maxWords = 1200,
): ParagraphSpan[][] {
  const chunks: ParagraphSpan[][] = [];
  let current: ParagraphSpan[] = [];
  let words = 0;
  for (const p of paragraphs) {
    const n = p.text.split(/\s+/).filter(Boolean).length;
    if (current.length > 0 && words + n > maxWords) {
      chunks.push(current);
      current = [];
      words = 0;
    }
    current.push(p);
    words += n;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

// ─── AI response schema + anchor resolution ──────────────────────────────────

export const rawErrorSchema = z.object({
  paragraph: z.coerce.number().int().min(1),
  before: z.string().optional().default(""),
  original: z.string().min(1),
  correction: z.string().default(""),
  category: z.enum(LANGUAGE_CHECK_CATEGORIES),
  explanation: z.string().default(""),
  explanationZh: z.string().default(""),
  // Expression tier only. Tolerate null / a lone string from the model.
  alternatives: z
    .preprocess(
      (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v : []),
      z.array(z.unknown()),
    )
    .transform((list) =>
      list
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .default([]),
});

export type RawLanguageError = z.infer<typeof rawErrorSchema>;

/**
 * Parses the model output. Invalid items are skipped individually (counted in
 * `invalid`) so one bad category never discards the whole check.
 */
export function parseRawErrors(json: unknown): {
  errors: RawLanguageError[];
  invalid: number;
} {
  const list = Array.isArray(json)
    ? json
    : json && typeof json === "object" && Array.isArray((json as { errors?: unknown }).errors)
      ? (json as { errors: unknown[] }).errors
      : null;
  if (!list) throw new Error("Response is not an error list");
  const errors: RawLanguageError[] = [];
  let invalid = 0;
  for (const item of list) {
    const parsed = rawErrorSchema.safeParse(item);
    if (parsed.success) errors.push(parsed.data);
    else invalid += 1;
  }
  return { errors, invalid };
}

function findAll(haystack: string, needle: string, ignoreCase: boolean): number[] {
  const out: number[] = [];
  const h = ignoreCase ? haystack.toLowerCase() : haystack;
  const n = ignoreCase ? needle.toLowerCase() : needle;
  if (!n) return out;
  let from = 0;
  for (;;) {
    const i = h.indexOf(n, from);
    if (i === -1) break;
    out.push(i);
    from = i + 1;
  }
  return out;
}

function overlaps(
  ranges: { start: number; end: number }[],
  start: number,
  end: number,
): boolean {
  return ranges.some((r) => start < r.end && end > r.start);
}

/**
 * LLM character offsets are unreliable, so errors are anchored by searching
 * the (paragraph-scoped) text for the exact `original` snippet, using `before`
 * to disambiguate repeats. Unanchorable or overlapping errors are dropped.
 */
export function resolveErrors(
  text: string,
  raw: RawLanguageError[],
  makeId: (n: number) => string = (n) => `e${n}`,
): { errors: LanguageCheckError[]; dropped: number } {
  const paragraphs = splitParagraphs(text);
  const accepted: LanguageCheckError[] = [];
  let dropped = 0;

  // Clear errors claim their spans first; expression-tier suggestions (which
  // often cover a whole clause) only get what is left, so a stylistic
  // suggestion can never hide a genuine grammar error underneath it.
  const ordered = [
    ...raw.filter((r) => !isExpressionCategory(r.category)),
    ...raw.filter((r) => isExpressionCategory(r.category)),
  ];

  for (const item of ordered) {
    const original = item.original;
    if (!original.trim() || original === item.correction) {
      dropped += 1;
      continue;
    }

    const para = paragraphs.find((p) => p.index === item.paragraph);
    const scopes: { base: number; text: string }[] = [];
    if (para) scopes.push({ base: para.start, text: para.text });
    scopes.push({ base: 0, text });

    let chosen: number | null = null;
    for (const scope of scopes) {
      for (const ignoreCase of [false, true]) {
        const positions = findAll(scope.text, original, ignoreCase)
          .map((i) => scope.base + i)
          .filter((abs) => !overlaps(accepted, abs, abs + original.length));
        if (positions.length === 0) continue;

        const before = item.before.trim();
        const withBefore = before
          ? positions.filter((abs) =>
              text.slice(0, abs).trimEnd().endsWith(before),
            )
          : [];
        chosen = (withBefore[0] ?? positions[0]) as number;
        break;
      }
      if (chosen !== null) break;
    }

    if (chosen === null) {
      dropped += 1;
      continue;
    }

    // Alternatives: de-duplicated, never equal to the original/main
    // correction, capped. Only meaningful for the expression tier.
    const alternatives = isExpressionCategory(item.category)
      ? [...new Set(item.alternatives)]
          .filter(
            (a) =>
              a !== item.correction &&
              a.toLowerCase() !== original.trim().toLowerCase(),
          )
          .slice(0, LANGUAGE_CHECK_MAX_ALTERNATIVES)
      : [];

    accepted.push({
      id: makeId(accepted.length + 1),
      start: chosen,
      end: chosen + original.length,
      original: text.slice(chosen, chosen + original.length),
      correction: item.correction,
      category: item.category,
      explanation: item.explanation,
      explanationZh: item.explanationZh,
      ...(alternatives.length > 0 ? { alternatives } : {}),
    });
  }

  accepted.sort((a, b) => a.start - b.start);
  // Renumber in reading order so the superscripts read 1, 2, 3 …
  accepted.forEach((e, i) => {
    e.id = makeId(i + 1);
  });
  return { errors: accepted, dropped };
}

// ─── Rendering helpers ───────────────────────────────────────────────────────

export type TextSegment =
  | { kind: "text"; text: string }
  | { kind: "error"; text: string; error: LanguageCheckError; number: number };

/** Splits `text` into plain / error segments (errors must be sorted + non-overlapping). */
export function buildSegments(
  text: string,
  errors: LanguageCheckError[],
): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  errors.forEach((error, i) => {
    if (error.start < cursor || error.end > text.length) return;
    if (error.start > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, error.start) });
    }
    segments.push({
      kind: "error",
      text: text.slice(error.start, error.end),
      error,
      number: i + 1,
    });
    cursor = error.end;
  });
  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) });
  }
  return segments;
}

/**
 * The essay with corrections applied. Expression-tier suggestions are optional
 * polish, so they are only applied when `includeExpression` is true (the
 * "polished" version); by default the result is the error-corrected essay.
 */
export function applyCorrections(
  text: string,
  errors: LanguageCheckError[],
  { includeExpression = false }: { includeExpression?: boolean } = {},
): string {
  return buildSegments(text, errors)
    .map((s) =>
      s.kind === "error" &&
      (includeExpression || !isExpressionCategory(s.error.category))
        ? s.error.correction
        : s.text,
    )
    .join("");
}

// ─── Word diff (for the red-strike → green chips) ────────────────────────────

export interface DiffToken {
  type: "same" | "removed" | "added";
  text: string;
}

function tokenize(s: string): string[] {
  // Words (incl. apostrophes/hyphens) or single non-space symbols.
  return s.match(/[\p{L}\p{N}'’-]+|[^\s]/gu) ?? [];
}

/** LCS-based word diff between the original snippet and its correction. */
export function wordDiff(original: string, correction: string): DiffToken[] {
  const a = tokenize(original);
  const b = tokenize(correction);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffToken[] = [];
  const push = (type: DiffToken["type"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += ` ${text}`;
    else out.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("removed", a[i++]);
    } else {
      push("added", b[j++]);
    }
  }
  while (i < n) push("removed", a[i++]);
  while (j < m) push("added", b[j++]);
  return out;
}

export interface DiffChange {
  /** Removed words ("" for a pure insertion). */
  removed: string;
  /** Added words ("" for a pure deletion). */
  added: string;
}

/**
 * Collapses a word diff into replacement groups for the red → green chips,
 * e.g. "of receiving our service with" → "regarding our service at" gives
 * [{of receiving → regarding}, {with → at}].
 */
export function diffChanges(original: string, correction: string): DiffChange[] {
  const changes: DiffChange[] = [];
  let current: DiffChange | null = null;
  for (const token of wordDiff(original, correction)) {
    if (token.type === "same") {
      current = null;
      continue;
    }
    if (!current) {
      current = { removed: "", added: "" };
      changes.push(current);
    }
    if (token.type === "removed") current.removed = token.text;
    else current.added = token.text;
  }
  return changes;
}

export interface ErrorContext {
  before: string;
  match: string;
  after: string;
}

/** The sentence around an error (clipped), so cards show where it occurs. */
export function contextAround(
  text: string,
  start: number,
  end: number,
  maxSide = 70,
): ErrorContext {
  const isBoundary = (ch: string) => ch === "\n" || /[.!?]/.test(ch);
  let from = start;
  while (from > 0 && start - from < maxSide && !isBoundary(text[from - 1])) from--;
  let to = end;
  while (to < text.length && to - end < maxSide && !isBoundary(text[to])) to++;
  // Keep the closing punctuation of the sentence.
  if (to < text.length && text[to] !== "\n" && to - end < maxSide) to++;
  const clippedStart = from > 0 && !isBoundary(text[from - 1]);
  const clippedEnd = to < text.length && !isBoundary(text[to - 1]) && text[to] !== "\n";
  return {
    before: (clippedStart ? "…" : "") + text.slice(from, start).trimStart(),
    match: text.slice(start, end),
    after: text.slice(end, to).trimEnd() + (clippedEnd ? "…" : ""),
  };
}

// ─── Misc ────────────────────────────────────────────────────────────────────

/** Strips ```json fences some models add despite instructions. */
export function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** Title from the first non-empty line, clipped. */
export function deriveTitle(transcript: string, fallback: string): string {
  const line = transcript
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  if (!line) return fallback;
  return line.length > 60 ? `${line.slice(0, 57)}…` : line;
}

/** Joins per-page OCR text with a paragraph break. */
export function joinPages(pages: string[]): string {
  return pages
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}
