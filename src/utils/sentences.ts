/**
 * Splits text into sentences for read-along (TTS) playback. Handles common
 * abbreviations conservatively (Mr., Mrs., Dr., etc.) so they aren't split.
 *
 * The text is split by newlines first, then each line is split on terminal
 * punctuation (`.`, `!`, `?`). This ensures that lines without terminal
 * punctuation (titles, headings, subheadings, labels) are isolated as their
 * own sentence units rather than being merged into the following line — which
 * previously caused them to never receive a read-along highlight span.
 *
 * Whitespace within each line is normalized to single spaces; punctuation is
 * preserved.
 */
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc",
  "inc", "ltd", "co", "corp", "no", "vol", "fig", "e.g", "i.e", "u.s",
]);

/**
 * Splits a single line into sentences based on terminal punctuation
 * (`.`, `!`, `?`). Whitespace within the line is normalized to single spaces.
 */
function splitLineSentences(line: string): string[] {
  const normalized = line.replace(/\s+/g, " ");
  if (!normalized.trim()) return [];

  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === "." || char === "!" || char === "?") {
      // Look ahead: must be followed by whitespace/end AND not an abbreviation.
      const next = normalized[i + 1];
      const isEnd = next === undefined || /\s/.test(next);
      if (!isEnd) continue;

      // Check abbreviation: word before the period.
      const before = normalized.slice(Math.max(0, start), i).trim();
      const lastWord = before.split(/\s+/).pop() || "";
      const wordLower = lastWord.toLowerCase().replace(/[^a-z.]/g, "");
      if (wordLower && ABBREVIATIONS.has(wordLower)) continue;

      // Decimal number (e.g. 3.14) — previous char is a digit.
      if (char === "." && /\d/.test(normalized[i - 1]) && /\d/.test(normalized[i + 1] || "")) {
        continue;
      }

      const sentence = normalized.slice(start, i + 1).trim();
      if (sentence) sentences.push(sentence);
      start = i + 1;
    }
  }

  const tail = normalized.slice(start).trim();
  if (tail) sentences.push(tail);

  return sentences;
}

export function splitSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  const sentences: string[] = [];

  // Split by newlines first so that lines without terminal punctuation
  // (titles, headings, subheadings) are isolated as their own sentence units
  // rather than being merged into the following line after whitespace
  // normalization.
  for (const line of text.split(/\n/)) {
    if (!line.trim()) continue;
    const lineSentences = splitLineSentences(line);
    for (const s of lineSentences) sentences.push(s);
  }

  return sentences.filter((s) => s.length > 0);
}
