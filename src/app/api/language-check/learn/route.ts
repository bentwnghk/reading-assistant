import { NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { listSessions, startSession } from "@/lib/language-check-learn"
import { createBodySchema } from "@/lib/language-check-learn-schema"
import { invalid, requireUser } from "@/lib/language-check-learn-http"

const START_ERRORS = {
  "essay-not-found": { status: 404, error: "Essay not found" },
  "essay-not-checked": { status: 409, error: "Check the essay before learning from it." },
  "no-mistakes": { status: 409, error: "The essay has no mistakes in the chosen categories." },
  limit: { status: 409, error: "Learning session limit reached. Delete an old one first." },
} as const

export async function GET() {
  try {
    const user = await requireUser()
    if ("response" in user) return user.response
    return NextResponse.json(await listSessions(user.userId))
  } catch (error) {
    console.error("Error listing language-check learn sessions:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}

/** Starts a session for the chosen categories, or resumes the matching unfinished one. */
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    if ("response" in user) return user.response
    const parsed = createBodySchema.safeParse(await request.json())
    if (!parsed.success) return invalid(parsed.error)
    const result = await startSession(user.userId, parsed.data)
    if (!result.ok) {
      const { status, error } = START_ERRORS[result.reason]
      return NextResponse.json({ error }, { status })
    }
    return NextResponse.json(
      { session: result.session, resumed: result.resumed },
      { status: result.resumed ? 200 : 201 },
    )
  } catch (error) {
    console.error("Error starting language-check learn session:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
