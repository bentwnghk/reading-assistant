import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import {
  isStaffRole,
  relinkStaffEssay,
  resolveStaffScope,
} from "@/lib/language-check"
import { staffRelinkSchema } from "@/lib/language-check-schema"

type Ctx = { params: Promise<{ id: string }> }

/**
 * Staff re-link an essay (from the Student essays table) to an existing
 * Topic Library entry, so the topic filter groups it again after e.g. the
 * original topic was deleted or the essay was uploaded against the wrong
 * task. The topic must be visible to the CALLER (own library or their
 * classes' topics — the same resolution as an upload); its task, essay type
 * and question image are re-snapshotted onto the essay, and the essay title
 * is left alone.
 */
export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isStaffRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const scope = await resolveStaffScope(session.user.role, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const parsed = staffRelinkSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { id } = await context.params
    const ok = await relinkStaffEssay(
      scope,
      { id: session.user.id, role: session.user.role ?? "student" },
      id,
      parsed.data.topicId,
    )
    if (!ok) {
      return NextResponse.json(
        { error: "Essay or topic not found" },
        { status: 404 },
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error relinking staff essay topic:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
