import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { getSessionForReview } from "@/lib/language-check-learn"
import { requireUser } from "@/lib/language-check-learn-http"

type Ctx = { params: Promise<{ id: string }> }

/**
 * The learner's history view of one of their sessions. Practice and quiz
 * questions/answers that are not finished yet are withheld server-side, so the
 * "View" dialog can never reveal them. (The learning page itself loads
 * `/learn/[id]`, which has to carry the exercises it is about to run.)
 */
export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const user = await requireUser()
    if ("response" in user) return user.response
    const { id } = await context.params
    const detail = await getSessionForReview(user.userId, id)
    if (!detail) {
      return NextResponse.json({ error: "Learning session not found" }, { status: 404 })
    }
    return NextResponse.json(detail)
  } catch (error) {
    console.error("Error fetching language-check learn session review:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
