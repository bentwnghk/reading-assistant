import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import {
  getStaffEssay,
  isStaffRole,
  renameStaffEssay,
  resolveStaffScope,
} from "@/lib/language-check"
import { staffRenameSchema } from "@/lib/language-check-schema"

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

/**
 * Staff rename an essay from the Student essays table. Only the title is
 * accepted; the caller's staff scope is re-validated against the essay's
 * owner (same as the GET detail view), so out-of-scope essays look
 * identical to missing ones.
 */
export async function PATCH(request: NextRequest, context: Ctx) {
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
    const parsed = staffRenameSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { id } = await context.params
    const ok = await renameStaffEssay(scope, id, parsed.data.title)
    if (!ok) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error renaming staff essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
