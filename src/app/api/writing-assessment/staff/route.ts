import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { parseError } from "@/utils/error"
import {
  isStaffRole,
  listStaffEssays,
  resolveStaffScope,
  STAFF_ESSAY_SORT_FIELDS,
  STAFF_ESSAY_SORT_ORDERS,
} from "@/lib/language-check"
import { LANGUAGE_CHECK_STATUSES } from "@/constants/languageCheck"

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().min(1).optional(),
  classId: z.string().min(1).optional(),
  /**
   * "1" = narrow to the CALLER'S OWN classes (the class picker's "My Classes"
   * option). Ignored when classId is set.
   */
  mine: z.enum(["0", "1"]).optional(),
  status: z.enum(LANGUAGE_CHECK_STATUSES).optional(),
  /** Writing-topic filter: essays written on this topic only. */
  topicId: z.string().min(1).optional(),
  sort: z.enum(STAFF_ESSAY_SORT_FIELDS).default("updated"),
  order: z.enum(STAFF_ESSAY_SORT_ORDERS).default("desc"),
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
    const data = await listStaffEssays(scope, {
      ...parsed.data,
      mineTeacherId: parsed.data.mine === "1" ? session.user.id : undefined,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error listing staff language-check essays:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
