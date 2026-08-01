const SKILLS: ReadingTestSkill[] = ["main-idea", "detail", "inference", "vocabulary", "purpose"];

/**
 * Computes per-skill performance from a set of reading-test questions.
 * Mirrors the correctness logic in `calculateTestScore` and the `skillStats`
 * memo in ReadingTest.tsx so the persisted breakdown is consistent with what
 * the student sees. Pure function — safe for client and server.
 */
export function computeSkillBreakdown(questions: ReadingTestQuestion[]): SkillBreakdown {
  const breakdown = {} as SkillBreakdown;
  for (const skill of SKILLS) {
    breakdown[skill] = { earned: 0, total: 0, correct: 0, count: 0 };
  }

  for (const q of questions) {
    const stat: SkillStat | undefined = breakdown[q.skillTested];
    if (!stat) continue;
    stat.total += q.points;
    stat.count += 1;

    let isCorrect = false;
    if (q.type === "short-answer") {
      stat.earned += q.earnedPoints ?? 0;
      isCorrect = (q.earnedPoints ?? 0) >= q.points;
    } else {
      const userAnswer = q.userAnswer?.toLowerCase().trim().replace(/[-\s]+/g, "-");
      const correctAnswer = q.correctAnswer.toLowerCase().trim().replace(/[-\s]+/g, "-");
      if (
        q.type === "multiple-choice" ||
        q.type === "inference" ||
        q.type === "vocab-context" ||
        q.type === "referencing"
      ) {
        isCorrect = userAnswer === correctAnswer || userAnswer === correctAnswer.charAt(0);
      } else {
        isCorrect = userAnswer === correctAnswer;
      }
      if (isCorrect) stat.earned += q.points;
    }
    if (isCorrect) stat.correct += 1;
  }

  return breakdown;
}

/** Returns the skill with the lowest accuracy (earned/total), or null if no data. */
export function getWeakestSkill(breakdown: SkillBreakdown): ReadingTestSkill | null {
  let weakest: ReadingTestSkill | null = null;
  let weakestAcc = Infinity;
  for (const skill of SKILLS) {
    const s = breakdown[skill];
    if (s.total > 0) {
      const acc = s.earned / s.total;
      if (acc < weakestAcc) {
        weakestAcc = acc;
        weakest = skill;
      }
    }
  }
  return weakest;
}
