import { z } from "zod";
import {
  LANGUAGE_CHECK_CATEGORIES,
  LANGUAGE_CHECK_LEARN_CLIENT_EVENT_TYPES,
  LANGUAGE_CHECK_LEARN_MAX_CATEGORIES,
} from "@/constants/languageCheck";
import { lessonSchema } from "@/utils/languageCheckLearn";

/**
 * Zod schemas for the *stored* form of learning content and progress — what the
 * browser saves and the server validates. Exercises are stored AFTER the
 * AI-response transforms (options already shuffled, reorder `tokens` already
 * built, errors already anchored), so they must NOT be re-parsed with the
 * AI-response schemas in `languageCheckLearn.ts` (that would reshuffle them).
 * The lesson output is idempotent under its own schema, so that one is reused.
 */

const short = (max = 600) => z.string().max(max);
const feedback = {
  hint: short(),
  explanation: short(1500),
  explanationZh: short(1500),
};

export const CATEGORY = z.enum(LANGUAGE_CHECK_CATEGORIES);

const passageError = z.object({
  start: z.number().int().min(0).max(5000),
  end: z.number().int().min(0).max(5000),
  wrong: short(),
  right: z.array(short()).min(1).max(8),
  explanation: short(1500),
  explanationZh: short(1500),
});

const id = z.string().min(1).max(40);

const exercise = z.union([
  z
    .object({
      id,
      type: z.literal("choice"),
      question: short(1500),
      options: z.array(short(300)).min(2).max(5),
      answer: short(300),
      ...feedback,
    })
    .refine((i) => i.options.includes(i.answer), "answer is not an option"),
  z.object({
    id,
    type: z.literal("fill-blank"),
    sentence: short(1500),
    answers: z.array(z.array(short(200)).min(1).max(8)).min(1).max(6),
    ...feedback,
  }),
  z.object({
    id,
    type: z.literal("reorder"),
    context: short(),
    answer: short(),
    alternatives: z.array(short()).max(8),
    tokens: z.array(short(80)).min(3).max(20),
    ...feedback,
  }),
  z.object({
    id,
    type: z.literal("error-correction"),
    passage: short(2500),
    errors: z.array(passageError).min(1).max(1),
    ...feedback,
  }),
  z.object({
    id,
    type: z.literal("proofread"),
    passage: short(2500),
    errors: z.array(passageError).min(1).max(5),
    ...feedback,
  }),
  z.object({
    id,
    type: z.literal("rewrite"),
    instruction: short(),
    source: short(1500),
    answers: z.array(short(1500)).min(1).max(8),
    criteria: short(),
    ...feedback,
  }),
  z.object({
    id,
    type: z.literal("compose"),
    instruction: short(),
    criteria: short(),
    modelAnswer: short(2000),
    ...feedback,
  }),
]);

export const storedExerciseList = (max: number) =>
  z
    .array(exercise)
    .max(max)
    .refine((list) => new Set(list.map((i) => i.id)).size === list.length, "duplicate exercise ids");

const answer = z.union([
  z.string().max(4000),
  z.array(z.string().max(500)).max(50),
  z.object({
    marked: z.array(z.number().int().min(0).max(1000)).max(300),
    fixes: z.record(z.string().max(8), z.string().max(500)),
  }),
]);

export const practiceResultSchema = z.object({
  score: z.number().min(0).max(1),
  attempts: z.number().int().min(0).max(100),
  completed: z.boolean(),
  revealed: z.boolean().optional(),
});

export const quizResultSchema = z.object({
  answer,
  score: z.number().min(0).max(1),
  correct: z.boolean(),
});

export const locationSchema = z.union([
  z.literal("summary"),
  z.object({
    unit: z.number().int().min(0).max(LANGUAGE_CHECK_LEARN_MAX_CATEGORIES - 1),
    stage: z.enum(["lesson", "practice", "quiz"]),
  }),
]);

export const MAX_PRACTICE_ITEMS = 100;
export const MAX_QUIZ_ITEMS = 20;

export const unitPatchSchema = z.object({
  category: CATEGORY,
  lesson: lessonSchema.nullish(),
  practice: storedExerciseList(MAX_PRACTICE_ITEMS).nullish(),
  quiz: storedExerciseList(MAX_QUIZ_ITEMS).nullish(),
  lessonSeen: z.boolean().optional(),
  practiceResults: z.record(id, practiceResultSchema).optional(),
  quizResults: z.record(id, quizResultSchema).optional(),
  previousQuizPrompts: z.array(short(300)).max(200).optional(),
  quizRound: z.number().int().min(1).max(200).optional(),
});

export const eventDetailsSchema = z
  .record(z.string().max(40), z.union([z.string().max(300), z.number(), z.boolean(), z.null()]))
  .refine((d) => Object.keys(d).length <= 10, "too many details");

export const clientEventSchema = z.object({
  type: z.enum(LANGUAGE_CHECK_LEARN_CLIENT_EVENT_TYPES),
  category: CATEGORY.optional(),
  details: eventDetailsSchema.optional(),
  key: z.string().min(1).max(120),
});

export const patchBodySchema = z.object({
  current: locationSchema.optional(),
  units: z.array(unitPatchSchema).max(LANGUAGE_CHECK_LEARN_MAX_CATEGORIES).optional(),
  events: z.array(clientEventSchema).max(20).optional(),
});

export const createBodySchema = z.object({
  essayId: z.string().min(1).max(64),
  categories: z.array(CATEGORY).min(1).max(LANGUAGE_CHECK_LEARN_MAX_CATEGORIES),
  age: z.number().int().min(8).max(18),
});
