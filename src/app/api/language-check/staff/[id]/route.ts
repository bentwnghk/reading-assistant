import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import {
  getStaffEssay,
  isStaffRole,
  resolveStaffScope,
} from "@/lib/language-check"

type Ctx = { params: Promise<{ id: string }> }

/** Read-only staff view of one essay (transcript + corrections, never scans). */
export async function GET(_request: NextRequest, context: Ctx) {
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
    const { id } = await context.params
    const essay = await getStaffEssay(scope, id)
    if (!essay) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    return NextResponse.json(essay)
  } catch (error) {
    console.error("Error fetching staff language-check essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
