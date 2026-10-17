import { NextRequest, NextResponse } from "next/server"
import { parseError } from "@/utils/error"
import { listEvents } from "@/lib/language-check-learn"
import { activityQuerySchema } from "@/lib/language-check-learn-schema"
import { invalid, requireStaff } from "@/lib/language-check-learn-http"

/** Scoped learning activity feed for staff. */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const parsed = activityQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!parsed.success) return invalid(parsed.error)
    return NextResponse.json(await listEvents(staff.scope, parsed.data))
  } catch (error) {
    console.error("Error listing staff language-check learn activity:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
