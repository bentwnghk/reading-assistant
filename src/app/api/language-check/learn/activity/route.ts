import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { listEvents } from "@/lib/language-check-learn"
import { activityQuerySchema } from "@/lib/language-check-learn-schema"
import { invalid, requireUser } from "@/lib/language-check-learn-http"

/** The signed-in learner's own activity log, newest first. */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    if ("response" in user) return user.response
    const parsed = activityQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!parsed.success) return invalid(parsed.error)
    const { range, page, pageSize } = parsed.data
    return NextResponse.json(
      await listEvents({ kind: "self", userId: user.userId }, { range, page, pageSize }),
    )
  } catch (error) {
    console.error("Error listing language-check learn activity:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
