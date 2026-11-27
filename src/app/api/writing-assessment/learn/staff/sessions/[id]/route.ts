import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { deleteStaffSession, getStaffSession } from "@/lib/language-check-learn"
import { requireStaff } from "@/lib/language-check-learn-http"

type Ctx = { params: Promise<{ id: string }> }

/** Read-only staff view of one learning session: material, answers and every quiz round. */
export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const { id } = await context.params
    const detail = await getStaffSession(staff.scope, id)
    if (!detail) {
      return NextResponse.json({ error: "Learning session not found" }, { status: 404 })
    }
    return NextResponse.json(detail)
  } catch (error) {
    console.error("Error fetching staff language-check learn session:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

/**
 * Staff delete from the Sessions table — every staff role, like the staff
 * essay delete: teachers delete within their classes, admins their school,
 * super-admins everywhere. `requireStaff` refuses students with 403 before
 * any query; the caller's scope is then applied INSIDE the DELETE
 * (`deleteStaffSession`), so a session outside the caller's scope answers 404
 * exactly like a missing one and nothing is written.
 */
export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const { id } = await context.params
    const ok = await deleteStaffSession(staff.scope, id)
    if (!ok) {
      return NextResponse.json({ error: "Learning session not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting staff language-check learn session:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
