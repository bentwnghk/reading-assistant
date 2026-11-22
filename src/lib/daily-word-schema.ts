import { z } from "zod";
import { DAILY_WORD_IMAGE_KINDS, DAILY_WORD_MAX_NOTE } from "./daily-word";

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const word = z.string().trim().min(1).max(100);
const str = z.string().trim().min(1).max(300);
const related = z.object({
  word: str,
  pos: z.string().max(20).catch(""),
  zh: str,
});

/** Shape of the AI-written calendar page (shared by client + server). */
export const dailyWordContentSchema = z.object({
  mascot: z.string().trim().min(1).max(16).catch("📖"),
  mascotPrompt: z.string().trim().max(240).catch(""),
  partOfSpeech: z.string().max(20).catch(""),
  meaningZh: str,
  example: str,
  exampleZh: str,
  quote: str,
  quoteZh: str,
  scene: z.array(z.string().max(16)).max(6).catch([]),
  sceneCaption: z.string().max(120).catch(""),
  scenePrompt: z.string().trim().max(400).catch(""),
  decode: z.array(str).max(4).catch([]),
  family: z.array(related).max(5).catch([]),
  associations: z.array(related).max(5).catch([]),
  collocations: z.array(z.object({ phrase: str, zh: str })).max(6).catch([]),
});

export const dailyWordActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pin"), dayKey, word }),
  z.object({
    action: z.literal("learn"),
    dayKey,
    word,
    onTime: z.boolean(),
  }),
  z.object({
    action: z.literal("note"),
    dayKey,
    word,
    note: z.string().max(DAILY_WORD_MAX_NOTE),
  }),
]);

export const dailyWordContentPutSchema = z.object({
  word,
  content: dailyWordContentSchema,
});

export const dailyWordImagePostSchema = z.object({
  word,
  kind: z.enum(DAILY_WORD_IMAGE_KINDS),
  mode: z.string().max(20).optional(),
  imageModel: z.string().max(100).optional(),
});
