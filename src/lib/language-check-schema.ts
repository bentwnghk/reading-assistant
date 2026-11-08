import { z } from "zod"
import { storedAssessmentSchema } from "@/utils/languageCheckAssessment"
import { storedEnhancedSchema } from "@/utils/languageCheckEnhanced"
import {
  LANGUAGE_CHECK_CATEGORIES,
  LANGUAGE_CHECK_ESSAY_TYPES,
  LANGUAGE_CHECK_MAX_TOPIC_CHARS,
  LANGUAGE_CHECK_MAX_TOPIC_TITLE_CHARS,
  LANGUAGE_CHECK_STATUSES,
  LANGUAGE_CHECK_MAX_ALTERNATIVES,
  LANGUAGE_CHECK_MAX_IMAGE_CHARS,
  LANGUAGE_CHECK_MAX_PAGES,
  LANGUAGE_CHECK_MAX_TRANSCRIPT_CHARS,
} from "@/constants/languageCheck"

export const imageSchema = z
  .string()
  .max(LANGUAGE_CHECK_MAX_IMAGE_CHARS)
  .regex(/^data:image\/(jpeg|png|webp);base64,/)

export const errorSchema = z.object({
  id: z.string().min(1).max(64),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  original: z.string().max(2000),
  correction: z.string().max(2000),
  category: z.enum(LANGUAGE_CHECK_CATEGORIES),
  explanation: z.string().max(2000),
  explanationZh: z.string().max(2000),
  alternatives: z
    .array(z.string().max(2000))
    .max(LANGUAGE_CHECK_MAX_ALTERNATIVES)
    .optional(),
})

export const topicSchema = z.object({
  title: z.string().trim().min(1).max(LANGUAGE_CHECK_MAX_TOPIC_TITLE_CHARS),
  topic: z.string().trim().min(1).max(LANGUAGE_CHECK_MAX_TOPIC_CHARS),
  essayType: z.enum(LANGUAGE_CHECK_ESSAY_TYPES),
  questionImage: imageSchema.or(z.literal("")).optional().default(""),
  /**
   * Optional class target: the topic also appears in the Topic Library of
   * the class's members. Null/undefined (or "") = personal to the creator.
   */
  classId: z
    .string()
    .max(64)
    .nullish()
    .transform((v) => (v ? v : null)),
})

export const createSchema = z.object({
  /**
   * Topic Library entry this essay answers (owned by the CALLER, who may be
   * a teacher scanning on a student's behalf). Its title/topic/type/image
   * are snapshotted onto the essay; the title becomes the essay title.
   */
  topicId: z.string().min(1).max(64),
  title: z.string().max(200).optional().default(""),
  images: z.array(imageSchema).min(1).max(LANGUAGE_CHECK_MAX_PAGES),
  ocrModel: z.string().max(100).optional().default(""),
  /**
   * Staff-only: scan this essay on a student's behalf. The essay is created
   * with user_id = studentId (the student owns it) and uploaded_by = caller.
   */
  studentId: z.string().min(1).max(64).optional(),
})

export const patchSchema = z.object({
  title: z.string().max(200).optional(),
  transcript: z.string().max(LANGUAGE_CHECK_MAX_TRANSCRIPT_CHARS).optional(),
  status: z.enum(LANGUAGE_CHECK_STATUSES).optional(),
  checkedText: z.string().max(LANGUAGE_CHECK_MAX_TRANSCRIPT_CHARS).optional(),
  corrections: z.array(errorSchema).max(500).optional(),
  ocrModel: z.string().max(100).optional(),
  checkModel: z.string().max(100).optional(),
  droppedCount: z.number().int().min(0).max(1000).optional(),
  assessment: storedAssessmentSchema.nullable().optional(),
  enhanced: storedEnhancedSchema.nullable().optional(),
})

/**
 * Staff-initiated re-check results (POST /api/writing-assessment/staff/[id]/recheck).
 * Only the fields a finished check produces are accepted — status is forced
 * to 'checked' and the assessment is reset server-side — so a staff caller
 * can never touch the transcript, title or anything else on a learner's
 * essay through this route.
 */
export const staffRecheckSchema = z.object({
  checkedText: z.string().max(LANGUAGE_CHECK_MAX_TRANSCRIPT_CHARS),
  corrections: z.array(errorSchema).max(500),
  checkModel: z.string().max(100),
  droppedCount: z.number().int().min(0).max(1000),
})
