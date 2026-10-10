import { z } from "zod"
import {
  LANGUAGE_CHECK_CATEGORIES,
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

export const createSchema = z.object({
  title: z.string().max(200).optional().default(""),
  images: z.array(imageSchema).min(1).max(LANGUAGE_CHECK_MAX_PAGES),
  ocrModel: z.string().max(100).optional().default(""),
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
})
