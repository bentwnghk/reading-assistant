type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

const INTERVALS: Record<number, number> = {
  0: 0,
  1: 1 * 24 * 60 * 60 * 1000,
  2: 3 * 24 * 60 * 60 * 1000,
  3: 7 * 24 * 60 * 60 * 1000,
  4: 14 * 24 * 60 * 60 * 1000,
  5: 30 * 24 * 60 * 60 * 1000,
};

export function calculateNextReview(
  currentLevel: MasteryLevel,
  correct: boolean
): { newMastery: MasteryLevel; nextReviewAt: number } {
  const now = Date.now();

  if (correct) {
    const newMastery = Math.min(currentLevel + 1, 5) as MasteryLevel;
    return {
      newMastery,
      nextReviewAt: now + INTERVALS[newMastery],
    };
  }

  const newMastery = Math.max(currentLevel - 1, 0) as MasteryLevel;
  return {
    newMastery,
    nextReviewAt: currentLevel === 0 ? now : now + INTERVALS[newMastery],
  };
}

export function isDueForReview(word: VocabularyWord): boolean {
  if (word.nextReviewAt === 0) return true;
  return word.nextReviewAt <= Date.now();
}

export function getMasteryLabel(level: number): string {
  const labels: Record<number, string> = {
    0: "New",
    1: "L1",
    2: "L2",
    3: "L3",
    4: "L4",
    5: "L5",
  };
  return labels[level] || "New";
}

export function getMasteryColor(level: number): string {
  const colors: Record<number, string> = {
    0: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    1: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    2: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
    3: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400",
    4: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    5: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  };
  return colors[level] || colors[0];
}
