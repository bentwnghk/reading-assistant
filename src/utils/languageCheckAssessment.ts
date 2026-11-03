import { z } from "zod";
import { LANGUAGE_ASSESSMENT_DIMENSIONS } from "@/constants/readingPrompts";

const score = z.coerce.number().transform((n) => Math.min(7, Math.max(0, Math.round(n))));
const bullet = z.object({ en: z.string().min(1), zh: z.string().min(1) });

export const languageAssessmentSchema = z.object({
  overall: score,
  scores: z.object(
    Object.fromEntries(LANGUAGE_ASSESSMENT_DIMENSIONS.map((d) => [d, score])) as Record<
      (typeof LANGUAGE_ASSESSMENT_DIMENSIONS)[number],
      typeof score
    >,
  ),
  strengths: z.array(bullet).min(1),
  weaknesses: z.array(bullet).min(1),
});

export type LanguageAssessment = z.infer<typeof languageAssessmentSchema>;

/** Persisted form: the assessment plus when/with what model it was made. */
export const storedAssessmentSchema = languageAssessmentSchema.extend({
  assessedAt: z.number().int().nonnegative(),
  model: z.string().max(100),
});

export type StoredLanguageAssessment = z.infer<typeof storedAssessmentSchema>;
