import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { requireStaff } from "@/lib/language-check-learn-http"
import { getTopicReport } from "@/lib/language-check-topic-report"
import { canDeleteTopic, deleteTopic } from "@/lib/language-check-topics"
import { auth } from "@/auth"

type Ctx = { params: Promise<{ id: string }> }

/** Class performance report for one writing topic (staff only). */
export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const session = await auth()
    const { id } = await context.params
    const viewer = { id: staff.userId, role: session?.user?.role ?? "teacher" }
    const report = await getTopicReport(staff.scope, viewer, id)
    if (!report) return NextResponse.json({ error: "Topic not found" }, { status: 404 })
    // Delete affordance mirrors the Topic Library rule (creator, or an
    // admin / super-admin for a topic their library shows), computed
    // server-side so the button never promises a 404.
    const canDelete = await canDeleteTopic(viewer, id)
    return NextResponse.json({ ...report, canDelete })
  } catch (error) {
    console.error("Error fetching topic report:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

/**
 * Delete the report's topic (staff only). Same right as the Topic Library:
 * the creator, or an admin / super-admin for a topic in their library scope
 * (`deleteTopic` — one atomic DELETE, so an out-of-scope topic answers 404
 * exactly like a missing one). Essays keep their writing-task snapshot
 * (`topic_id` is set NULL) and drop out of the report; saved AI reports for
 * the topic cascade away.
 */
export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const session = await auth()
    const { id } = await context.params
    const ok = await deleteTopic(
      { id: staff.userId, role: session?.user?.role ?? "teacher" },
      id,
    )
    if (!ok) return NextResponse.json({ error: "Topic not found" }, { status: 404 })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Error deleting topic report:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
