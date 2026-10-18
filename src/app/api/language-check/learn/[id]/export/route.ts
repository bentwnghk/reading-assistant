import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { getSession } from "@/lib/language-check-learn"
import { requireUser } from "@/lib/language-check-learn-http"
import { canExportLearnSession } from "@/utils/languageCheckLearnProgress"

type Ctx = { params: Promise<{ id: string }> }

/**
 * Full content of one of the caller's sessions for the Word export (every
 * practice and quiz question with its model answer). Learners get it only once
 * the session is completed; staff any time. Withheld here, on the server — the
 * export button being disabled is only a convenience.
 */
export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const user = await requireUser()
    if ("response" in user) return user.response
    const { id } = await context.params
    const detail = await getSession(user.userId, id)
    if (!detail) {
      return NextResponse.json({ error: "Learning session not found" }, { status: 404 })
    }
    if (!canExportLearnSession(user.role, detail.session.status)) {
      return NextResponse.json(
        { error: "Finish this learning session to export it" },
        { status: 403 },
      )
    }
    return NextResponse.json({ session: detail.session })
  } catch (error) {
    console.error("Error exporting language-check learn session:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
