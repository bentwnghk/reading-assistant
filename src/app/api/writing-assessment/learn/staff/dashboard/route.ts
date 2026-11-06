import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { getStaffDashboard, safeTimeZone } from "@/lib/language-check-learn"
import { staffDashboardQuerySchema } from "@/lib/language-check-learn-schema"
import { invalid, requireStaff } from "@/lib/language-check-learn-http"

/** Staff learning dashboard, scoped like the essay log (teacher → classes, admin → school, super-admin → all). */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const parsed = staffDashboardQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    )
    if (!parsed.success) return invalid(parsed.error)
    const { tz, mine, ...rest } = parsed.data
    return NextResponse.json(
      await getStaffDashboard(staff.scope, {
        ...rest,
        mineTeacherId: mine === "1" ? staff.userId : undefined,
        timeZone: safeTimeZone(tz),
      }),
    )
  } catch (error) {
    console.error("Error loading staff language-check learn dashboard:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
