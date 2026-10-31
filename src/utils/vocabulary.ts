type PriorityRating = "hard" | "medium" | "easy" | "unrated";

/**
 * Minimum words/phrases required to start a vocabulary game — the solo
 * spelling game and quiz gates, and the advisory hint in the Glossary
 * section. Keep in sync with the multiplayer battle minimum,
 * MIN_BATTLE_WORDS in realtime/src/game/words.ts.
 */
export const MIN_GAME_WORDS = 10;

function getPriority(rating?: GlossaryRating): PriorityRating {
  if (!rating) return "unrated";
  return rating;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function sortGlossaryByPriority(
  glossary: GlossaryEntry[],
  ratings: Record<string, GlossaryRating>,
  options: { prioritize: boolean; shuffle: boolean }
): GlossaryEntry[] {
  if (!options.prioritize && !options.shuffle) {
    return glossary;
  }

  if (!options.prioritize && options.shuffle) {
    return shuffleArray(glossary);
  }

  const groups = {
    hard: [] as GlossaryEntry[],
    medium: [] as GlossaryEntry[],
    easy: [] as GlossaryEntry[],
    unrated: [] as GlossaryEntry[],
  };

  for (const entry of glossary) {
    groups[getPriority(ratings[entry.word])].push(entry);
  }

  const processGroup = (group: GlossaryEntry[]) =>
    options.shuffle ? shuffleArray(group) : group;

  return [
    ...processGroup(groups.hard),
    ...processGroup(groups.medium),
    ...processGroup(groups.easy),
    ...processGroup(groups.unrated),
  ];
}

export function getWordStats(
  glossary: GlossaryEntry[],
  ratings: Record<string, GlossaryRating>
): { hard: number; medium: number; easy: number; unrated: number } {
  const stats = { hard: 0, medium: 0, easy: 0, unrated: 0 };

  for (const entry of glossary) {
    const priority = getPriority(ratings[entry.word]);
    stats[priority]++;
  }

  return stats;
}

export function generateWordCountOptions(totalWords: number): number[] {
  if (totalWords <= 20) return [];
  const options: number[] = [];
  for (let n = 10; n < totalWords; n += 10) {
    options.push(n);
  }
  return options;
}

/**
 * The glossary prompt lists highlighted terms one per line, but a model may
 * still split a comma-containing phrase (e.g. "Agriculture, Fisheries and
 * Conservation Department") into separate entries at its commas. Stitch such
 * fragments back into the single highlighted term the student selected.
 *
 * A run of consecutive entries is merged only when its words joined together
 * exactly equal a comma-containing highlighted term (match ignores case,
 * commas and repeated whitespace, so fragments like "agriculture," also
 * match). The merged entry keeps the LAST fragment's definition fields — for
 * "X, Y and Z Department"-style names the trailing fragment carries the head
 * noun the definitions describe — with `word` replaced by the full listed
 * term. Entries that match nothing are passed through untouched.
 */
export function mergeSplitGlossaryEntries(
  entries: GlossaryEntry[],
  highlightedWords: string[]
): GlossaryEntry[] {
  if (entries.length < 2 || highlightedWords.length === 0) return entries;

  const normalize = (value: string) =>
    value.replace(/,/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

  const phrases = new Map<string, string>();
  for (const word of highlightedWords) {
    if (word.includes(",")) phrases.set(normalize(word), word);
  }
  if (phrases.size === 0) return entries;

  const result: GlossaryEntry[] = [];
  let i = 0;
  while (i < entries.length) {
    let mergedSpan = 0;
    // Try the longest run first so a matching prefix cannot strand the rest
    // of the phrase as unmatched leftovers.
    for (let j = entries.length - 1; j > i; j--) {
      const joined = normalize(entries.slice(i, j + 1).map((e) => e.word).join(" "));
      const phrase = phrases.get(joined);
      if (phrase) {
        result.push({ ...entries[j], word: phrase });
        mergedSpan = j - i + 1;
        break;
      }
    }
    if (mergedSpan > 0) {
      i += mergedSpan;
    } else {
      result.push(entries[i]);
      i += 1;
    }
  }
  return result;
}
