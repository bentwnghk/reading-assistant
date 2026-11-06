import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import {
  isStaffRole,
  resolveStaffScope,
  staffRecheckEssay,
} from "@/lib/language-check"
import { staffRecheckSchema } from "@/lib/language-check-schema"

type Ctx = { params: Promise<{ id: string }> }

/**
 * Staff re-check a learner's essay from the staff essay log. The check itself
 * runs client-side (same pipeline as an owner re-check); this endpoint only
 * persists the finished result, after re-validating the caller's staff scope
 * against the essay's owner.
 */
export async function POST(request: NextRequest, context: Ctx) {
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
    const parsed = staffRecheckSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { id } = await context.params
    const ok = await staffRecheckEssay(scope, id, parsed.data)
    if (!ok) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving staff re-check:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
