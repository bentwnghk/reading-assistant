import type { ReadingHistory } from "@/store/history";

type PriorityRating = "hard" | "medium" | "easy" | "unrated";

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

const RATING_PRIORITY: Record<string, number> = {
  hard: 3,
  medium: 2,
  easy: 1,
};

export interface MergedGlossary {
  entries: GlossaryEntry[];
  ratings: Record<string, GlossaryRating>;
  addedCount: number;
}

export function mergeGlossariesFromSessions(
  currentGlossary: GlossaryEntry[],
  currentRatings: Record<string, GlossaryRating>,
  selectedSessionIds: string[],
  history: ReadingHistory[]
): MergedGlossary {
  if (selectedSessionIds.length === 0) {
    return { entries: currentGlossary, ratings: currentRatings, addedCount: 0 };
  }

  const allEntries: GlossaryEntry[] = [...currentGlossary];
  const mergedRatings: Record<string, GlossaryRating> = { ...currentRatings };

  for (const sessionId of selectedSessionIds) {
    const session = history.find((h) => h.id === sessionId);
    if (session?.glossary) {
      allEntries.push(...session.glossary);
    }
    if (session?.glossaryRatings) {
      for (const [word, rating] of Object.entries(session.glossaryRatings)) {
        const existing = mergedRatings[word];
        if (!existing || (RATING_PRIORITY[rating] ?? 0) > (RATING_PRIORITY[existing] ?? 0)) {
          mergedRatings[word] = rating as GlossaryRating;
        }
      }
    }
  }

  const seen = new Set<string>();
  const uniqueEntries = allEntries.filter((entry) => {
    const key = entry.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const currentWords = new Set(currentGlossary.map((e) => e.word.toLowerCase()));
  const addedCount = uniqueEntries.filter((e) => !currentWords.has(e.word.toLowerCase())).length;

  return { entries: uniqueEntries, ratings: mergedRatings, addedCount };
}

export function generateWordCountOptions(totalWords: number): number[] {
  if (totalWords <= 20) return [];
  const options: number[] = [];
  for (let n = 10; n < totalWords; n += 10) {
    options.push(n);
  }
  return options;
}
