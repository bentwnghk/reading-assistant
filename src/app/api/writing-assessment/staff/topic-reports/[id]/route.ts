import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { requireStaff } from "@/lib/language-check-learn-http"
import { getTopicReport } from "@/lib/language-check-topic-report"
import { auth } from "@/auth"

type Ctx = { params: Promise<{ id: string }> }

/** Class performance report for one writing topic (staff only). */
export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const session = await auth()
    const { id } = await context.params
    const report = await getTopicReport(
      staff.scope,
      { id: staff.userId, role: session?.user?.role ?? "teacher" },
      id,
    )
    if (!report) return NextResponse.json({ error: "Topic not found" }, { status: 404 })
    return NextResponse.json(report)
  } catch (error) {
    console.error("Error fetching topic report:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
