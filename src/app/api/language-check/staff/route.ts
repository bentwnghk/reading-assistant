import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import {
  isStaffRole,
  listStaffEssays,
  resolveStaffScope,
} from "@/lib/language-check"
import { LANGUAGE_CHECK_STATUSES } from "@/constants/languageCheck"

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().min(1).optional(),
  status: z.enum(LANGUAGE_CHECK_STATUSES).optional(),
})

/** Staff essay log: scoped list + scope-wide stats + student filter options. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isStaffRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const parsed = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    )
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const scope = await resolveStaffScope(session.user.role, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const data = await listStaffEssays(scope, parsed.data)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error listing staff language-check essays:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
