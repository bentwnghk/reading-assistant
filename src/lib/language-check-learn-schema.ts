import { z } from "zod"
import { LANGUAGE_CHECK_LEARN_RANGES } from "@/constants/languageCheck"

export {
  createBodySchema,
  patchBodySchema,
} from "@/utils/languageCheckLearnStored"

const range = z.coerce
  .number()
  .int()
  .refine((n) => (LANGUAGE_CHECK_LEARN_RANGES as readonly number[]).includes(n), "bad range")

/** Query of the dashboards / activity feeds. */
export const dashboardQuerySchema = z.object({
  range: range.default(30),
  tz: z.string().max(64).optional(),
})

export const staffDashboardQuerySchema = dashboardQuerySchema.extend({
  userId: z.string().min(1).max(64).optional(),
  classId: z.string().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const activityQuerySchema = z.object({
  range: range.default(0),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().min(1).max(64).optional(),
  classId: z.string().min(1).max(64).optional(),
})

export const sessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().min(1).max(64).optional(),
  classId: z.string().min(1).max(64).optional(),
})
