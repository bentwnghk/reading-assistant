import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { parseError } from "@/utils/error"
import { requireStaff, invalid } from "@/lib/language-check-learn-http"
import { saveFollowUpWorksheet } from "@/lib/language-check-topic-ai-report"
import type { FollowUpItem } from "@/utils/languageCheckLearn"

type Ctx = { params: Promise<{ id: string }> }

const MAX_BODY_CHARS = 200_000

/**
 * Exercises were validated by the client-side parser at generation time; here
 * we check the shell (type + id) and cap the payload, not the full exercise
 * payloads (they are opaque passthrough).
 */
const itemSchema = z.object({
  category: z.string().min(1).max(50),
  exercise: z.object({ type: z.string().min(1).max(30), id: z.string().max(64) }).passthrough(),
})

const bodySchema = z.object({
  generatedAt: z.number().int().positive(),
  items: z.array(itemSchema).min(1).max(14),
})

/**
 * Persist a generated follow-up worksheet next to its saved AI report, so it
 * survives reloads, sign-out and other devices. Tied to the report snapshot:
 * 404 when no report row exists, 409 when the report was regenerated since.
 */
export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const { id } = await context.params
    const raw = await request.text()
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Worksheet too large" }, { status: 413 })
    }
    const parsed = bodySchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return invalid(parsed.error)

    const result = await saveFollowUpWorksheet(
      id,
      staff.userId,
      parsed.data.generatedAt,
      parsed.data.items as unknown as FollowUpItem[],
    )
    if (result === "no-report") {
      return NextResponse.json({ error: "No saved report for this topic" }, { status: 404 })
    }
    if (result === "stale") {
      return NextResponse.json({ error: "Report was regenerated — generate the worksheet again" }, { status: 409 })
    }
    return NextResponse.json({ saved: true })
  } catch (error) {
    console.error("Error saving follow-up worksheet:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
