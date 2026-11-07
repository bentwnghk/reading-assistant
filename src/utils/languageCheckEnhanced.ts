import { z } from "zod";
import { LANGUAGE_CHECK_MAX_TRANSCRIPT_CHARS } from "@/constants/languageCheck";

const version = z.string().trim().min(1).max(LANGUAGE_CHECK_MAX_TRANSCRIPT_CHARS * 2);

/** Raw AI output: the two enhanced versions of the essay. */
export const enhancedOutputSchema = z.object({ light: version, heavy: version });

/** Persisted form: both versions plus when/with what model they were made. */
export const storedEnhancedSchema = enhancedOutputSchema.extend({
  generatedAt: z.number().int().nonnegative(),
  model: z.string().max(100),
});

export type StoredEnhanced = z.infer<typeof storedEnhancedSchema>;
