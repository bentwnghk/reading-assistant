import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import {
  isStaffRole,
  moveEssayOwnership,
  resolveStaffScope,
} from "@/lib/language-check"
import { moveOwnerSchema } from "@/lib/language-check-schema"

type Ctx = { params: Promise<{ id: string }> }

/**
 * Staff remediation for a mis-attributed essay: transfer it to a student in
 * scope. Covers both real-world mistakes — "Check an essay for" left on
 * "Myself" (the caller owns the essay) or aimed at the wrong learner (the
 * caller uploaded it). Only ownership moves; the transcript, corrections,
 * assessment and scan stay, so the check is never wasted. The caller
 * becomes the recorded uploader, exactly like a fresh teacher upload.
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
    const parsed = moveOwnerSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { id } = await context.params
    const result = await moveEssayOwnership(
      session.user.id,
      scope,
      id,
      parsed.data.studentId,
    )
    if (result === "not-found") {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    if (result === "same-owner") {
      return NextResponse.json(
        { error: "The essay already belongs to this student." },
        { status: 400 },
      )
    }
    if (result === "not-a-student") {
      return NextResponse.json(
        {
          error:
            "You can only move essays to students in your classes or school.",
        },
        { status: 403 },
      )
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error moving language-check essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
