import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { parseError } from "@/utils/error"
import { requireStaff, invalid } from "@/lib/language-check-learn-http"
import { savePriorityHandout } from "@/lib/language-check-topic-ai-report"
import type { PriorityHandout } from "@/utils/languageCheckLearn"

type Ctx = { params: Promise<{ id: string }> }

const MAX_BODY_CHARS = 400_000

/**
 * The handout was validated by the client-side parser at generation time
 * (parseHandout + parseExercises); here we check the shell (a lesson with a
 * summary + a non-empty exercise list) and cap the payload, not the full
 * payloads (they are opaque passthrough). The exercise cap is a payload
 * guard, NOT the handout length — the generator targets 10 questions, so
 * keep this comfortably above it.
 */
const handoutSchema = z.object({
  lesson: z.object({ summary: z.string().min(1).max(2000) }).passthrough(),
  exercises: z
    .array(z.object({ type: z.string().min(1).max(30), id: z.string().max(64) }).passthrough())
    .min(1)
    .max(30),
})

const bodySchema = z.object({
  generatedAt: z.number().int().positive(),
  /** Position of the "Teaching priorities" card on the report (0-based). */
  index: z.number().int().min(0).max(9),
  handout: handoutSchema,
})

/**
 * Persist ONE generated priority handout next to its saved AI report (merged
 * into the row's priority_handouts map under its priority index), so the card
 * offers "download again" / "regenerate" across reloads, sign-out and other
 * devices. Tied to the report snapshot: 404 when no report row exists, 409
 * when the report was regenerated since.
 */
export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const { id } = await context.params
    const raw = await request.text()
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Handout too large" }, { status: 413 })
    }
    const parsed = bodySchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return invalid(parsed.error)

    const result = await savePriorityHandout(
      id,
      staff.userId,
      parsed.data.generatedAt,
      parsed.data.index,
      parsed.data.handout as unknown as PriorityHandout,
    )
    if (result === "no-report") {
      return NextResponse.json({ error: "No saved report for this topic" }, { status: 404 })
    }
    if (result === "stale") {
      return NextResponse.json({ error: "Report was regenerated — generate the handout again" }, { status: 409 })
    }
    return NextResponse.json({ saved: true })
  } catch (error) {
    console.error("Error saving priority handout:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
