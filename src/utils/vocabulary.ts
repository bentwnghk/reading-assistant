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
