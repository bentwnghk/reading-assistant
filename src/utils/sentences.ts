/**
 * Splits text into sentences for read-along (TTS) playback. Handles common
 * abbreviations conservatively (Mr., Mrs., Dr., etc.) so they aren't split.
 * Returns sentences with trailing whitespace/punctuation preserved.
 */
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc",
  "inc", "ltd", "co", "corp", "no", "vol", "fig", "e.g", "i.e", "u.s",
]);

export function splitSentences(text: string): string[] {
  if (!text || !text.trim()) return [];
  // Work on a single-space-normalized copy for splitting, but return slices
  // of the original so punctuation/spacing is preserved.
  const sentences: string[] = [];
  let start = 0;
  const normalized = text.replace(/\s+/g, " ");

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

  return sentences.filter((s) => s.length > 0);
}
