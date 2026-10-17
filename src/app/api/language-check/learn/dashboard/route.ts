import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { getOwnDashboard, safeTimeZone } from "@/lib/language-check-learn"
import { dashboardQuerySchema } from "@/lib/language-check-learn-schema"
import { invalid, requireUser } from "@/lib/language-check-learn-http"

/** The signed-in learner's own learning dashboard. */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    if ("response" in user) return user.response
    const parsed = dashboardQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!parsed.success) return invalid(parsed.error)
    const data = await getOwnDashboard(user.userId, {
      range: parsed.data.range,
      timeZone: safeTimeZone(parsed.data.tz),
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error loading language-check learn dashboard:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
