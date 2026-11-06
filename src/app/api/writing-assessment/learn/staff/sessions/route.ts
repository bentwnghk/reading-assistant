import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { listStaffSessions } from "@/lib/language-check-learn"
import { sessionsQuerySchema } from "@/lib/language-check-learn-schema"
import { invalid, requireStaff } from "@/lib/language-check-learn-http"

/** Scoped list of learners' learning sessions (lightweight: progress only). */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const parsed = sessionsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!parsed.success) return invalid(parsed.error)
    const { mine, ...rest } = parsed.data
    return NextResponse.json(
      await listStaffSessions(staff.scope, {
        ...rest,
        mineTeacherId: mine === "1" ? staff.userId : undefined,
      }),
    )
  } catch (error) {
    console.error("Error listing staff language-check learn sessions:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
