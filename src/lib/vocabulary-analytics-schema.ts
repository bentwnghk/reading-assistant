import { z } from "zod";
import { VOCABULARY_ANALYTICS_RANGES } from "@/constants/vocabularyActivity";

const range = z.coerce
  .number()
  .int()
  .refine(
    (n) => (VOCABULARY_ANALYTICS_RANGES as readonly number[]).includes(n),
    "bad range"
  );

const filters = {
  userId: z.string().min(1).max(64).optional(),
  classId: z.string().min(1).max(64).optional(),
};

const paging = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

export const analyticsDashboardQuerySchema = z.object({
  range: range.default(30),
  tz: z.string().max(64).optional(),
  ...filters,
  ...paging,
});

export const analyticsActivityQuerySchema = z.object({
  range: range.default(0),
  ...filters,
  ...paging,
});

export const analyticsSessionsQuerySchema = z.object({
  range: range.default(0),
  mode: z.enum(["flashcard", "quiz", "spelling"]).optional(),
  ...filters,
  ...paging,
});

export const analyticsStudentsQuerySchema = z.object({
  classId: z.string().min(1).max(64).optional(),
});
