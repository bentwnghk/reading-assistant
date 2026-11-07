import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import {
  getEssay,
  updateEssay,
  deleteEssay,
  essayHasAssessment,
  essayHasEnhanced,
  isStaffRole,
} from "@/lib/language-check"
import { patchSchema } from "@/lib/language-check-schema"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await context.params
    const essay = await getEssay(session.user.id, id)
    if (!essay) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    return NextResponse.json(essay)
  } catch (error) {
    console.error("Error fetching language-check essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await context.params
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    // Students cannot re-assess an assessed essay: the first saved
    // assessment is final for them. Only staff may replace one (staff log
    // route, or here when the staff caller is the essay's uploader). A null
    // assessment (the reset a fresh check writes) is still allowed — it
    // makes the essay assessable again against the new corrections.
    if (parsed.data.assessment && !isStaffRole(session.user.role)) {
      const assessed = await essayHasAssessment(session.user.id, id)
      if (assessed) {
        return NextResponse.json(
          { error: "Essay already assessed" },
          { status: 403 },
        )
      }
    }
    // Students cannot regenerate enhanced essays either: the first saved
    // generation is final for them. Only staff may replace one (staff log
    // route, or here when the staff caller is the essay's uploader). A null
    // enhanced (the reset a fresh check/transcription writes) is still
    // allowed — it makes the essay generatable again.
    if (parsed.data.enhanced && !isStaffRole(session.user.role)) {
      const enhanced = await essayHasEnhanced(session.user.id, id)
      if (enhanced) {
        return NextResponse.json(
          { error: "Essay already enhanced" },
          { status: 403 },
        )
      }
    }
    const ok = await updateEssay(session.user.id, id, parsed.data)
    if (!ok) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating language-check essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await context.params
    const ok = await deleteEssay(session.user.id, id)
    if (!ok) {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting language-check essay:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
