import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import {
  isStaffRole,
  resolveStaffScope,
  setStaffAssessment,
} from "@/lib/language-check"
import { storedAssessmentSchema } from "@/utils/languageCheckAssessment"

type Ctx = { params: Promise<{ id: string }> }

/** Staff save an AI assessment for an essay inside their scope. */
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
    const parsed = storedAssessmentSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid assessment" }, { status: 400 })
    }
    const { id } = await context.params
    const ok = await setStaffAssessment(scope, id, parsed.data)
    if (!ok) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving staff assessment:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
