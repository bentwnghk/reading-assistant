import { z } from "zod";
import {
  CONTENT_ASSESSMENT_DIMENSIONS,
  LANGUAGE_ASSESSMENT_DIMENSIONS,
  ORGANIZATION_ASSESSMENT_DIMENSIONS,
} from "@/constants/readingPrompts";

const score = z.coerce.number().transform((n) => Math.min(7, Math.max(0, Math.round(n))));
// The overall is the SUM of the three criterion scores (each 0-7), so it
// spans 0-21. Kept separate from `score` (the per-criterion clamp) because
// stored assessments are re-validated with this schema on every read/patch —
// clamping to 7 would silently corrupt a saved 21 back down to 7.
const overallScore = z.coerce.number().transform((n) => Math.min(21, Math.max(0, Math.round(n))));
const bullet = z.object({ en: z.string().min(1), zh: z.string().min(1) });
const bullets = z.array(bullet).min(1);

const feedback = z.object({
  score,
  strengths: bullets,
  weaknesses: bullets,
});

const dims = <T extends readonly string[]>(keys: T) =>
  z.object(
    Object.fromEntries(keys.map((d) => [d, score])) as Record<T[number], typeof score>,
  );
const languageScores = dims(LANGUAGE_ASSESSMENT_DIMENSIONS);
const contentScores = dims(CONTENT_ASSESSMENT_DIMENSIONS);
const organizationScores = dims(ORGANIZATION_ASSESSMENT_DIMENSIONS);

/** Raw AI output: one block per HKDSE criterion (Content, Language, Organization). */
const aiOutputSchema = z.object({
  content: feedback.extend({ scores: contentScores }),
  language: feedback.extend({ scores: languageScores }),
  organization: feedback.extend({ scores: organizationScores }),
});

const criterionShape = z.object({
  score: z.number().int().min(0).max(7),
  // Absent on assessments saved before Content/Organization had sub-scores.
  scores: z.record(z.string(), z.number().int().min(0).max(7)).optional(),
  strengths: bullets,
  weaknesses: bullets,
});

/**
 * Stored/normalised shape. `scores`/`strengths`/`weaknesses` are the
 * LANGUAGE block (kept at the top level so assessments saved before Content
 * and Organization existed stay valid). `content`/`organization`/
 * `languageScore` are absent on those legacy assessments, whose `overall`
 * is the Language score itself.
 */
const assessmentShape = z.object({
  overall: overallScore,
  languageScore: score.optional(),
  scores: languageScores,
  strengths: bullets,
  weaknesses: bullets,
  content: criterionShape.optional(),
  organization: criterionShape.optional(),
});

export const languageAssessmentSchema = aiOutputSchema.transform((o) => ({
  overall: o.content.score + o.language.score + o.organization.score,
  languageScore: o.language.score,
  scores: o.language.scores,
  strengths: o.language.strengths,
  weaknesses: o.language.weaknesses,
  content: o.content,
  organization: o.organization,
}));

export type LanguageAssessment = z.infer<typeof assessmentShape>;

/** Persisted form: the assessment plus when/with what model it was made. */
export const storedAssessmentSchema = assessmentShape.extend({
  assessedAt: z.number().int().nonnegative(),
  model: z.string().max(100),
});

export type StoredLanguageAssessment = z.infer<typeof storedAssessmentSchema>;
