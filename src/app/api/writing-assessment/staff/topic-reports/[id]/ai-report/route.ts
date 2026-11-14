import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { parseError } from "@/utils/error"
import { requireStaff, invalid } from "@/lib/language-check-learn-http"
import { getTopicReport } from "@/lib/language-check-topic-report"
import {
  getSavedAiReport,
  getTopicAiEvidence,
  saveAiReport,
} from "@/lib/language-check-topic-ai-report"
import { aiInsightsSchema } from "@/utils/languageCheckAiReport"
import { auth } from "@/auth"

type Ctx = { params: Promise<{ id: string }> }

const MAX_BODY_CHARS = 600_000

const bodySchema = z.object({
  model: z.string().max(200),
  categories: z.array(z.record(z.string(), z.unknown())).max(60),
  insights: aiInsightsSchema,
})

/**
 * Saved AI assessment report for a topic (staff only).
 *  GET            → { saved, currentCount } (currentCount = checked essay rows now)
 *  GET ?evidence=1 → { evidence } anonymous class evidence for generation
 *  PUT            → saves the generated report (one per topic per staff member)
 */
async function viewerOf(userId: string) {
  const session = await auth()
  return { id: userId, role: session?.user?.role ?? "teacher" }
}

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const { id } = await context.params
    const viewer = await viewerOf(staff.userId)

    if (request.nextUrl.searchParams.get("evidence")) {
      const evidence = await getTopicAiEvidence(staff.scope, viewer, id)
      if (!evidence) return NextResponse.json({ error: "Topic not found" }, { status: 404 })
      return NextResponse.json({ evidence })
    }

    const current = await getTopicReport(staff.scope, viewer, id)
    if (!current) return NextResponse.json({ error: "Topic not found" }, { status: 404 })
    const saved = await getSavedAiReport(id, staff.userId)
    return NextResponse.json({
      saved: saved?.report ?? null,
      currentCount: current.checkedCount,
    })
  } catch (error) {
    console.error("Error fetching topic AI report:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const { id } = await context.params
    const raw = await request.text()
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Report too large" }, { status: 413 })
    }
    const parsed = bodySchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return invalid(parsed.error)

    // Counts and the chart snapshot come from the server, never the client.
    const current = await getTopicReport(staff.scope, await viewerOf(staff.userId), id)
    if (!current) return NextResponse.json({ error: "Topic not found" }, { status: 404 })

    const report: LanguageCheckAiReport = {
      version: 1,
      generatedAt: Date.now(),
      model: parsed.data.model,
      essayCount: current.checkedCount,
      base: current,
      categories: parsed.data.categories as unknown as LanguageCheckAiCategoryEvidence[],
      insights: parsed.data.insights,
    }
    await saveAiReport(id, staff.userId, report)
    return NextResponse.json({ saved: report, currentCount: current.checkedCount })
  } catch (error) {
    console.error("Error saving topic AI report:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
