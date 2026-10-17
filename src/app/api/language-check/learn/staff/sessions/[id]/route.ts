import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { getStaffSession } from "@/lib/language-check-learn"
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
