import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { parseError } from "@/utils/error"
import { requireStaff, invalid } from "@/lib/language-check-learn-http"
import { listStaffStudents, listAllStaffStudents } from "@/lib/language-check-learn"

const querySchema = z.object({
  classId: z.string().min(1).optional(),
  /**
   * "1" = every in-scope student (the teacher-upload picker), not just those
   * with existing essays/learning history — a first essay needs a first pick.
   */
  all: z.enum(["0", "1"]).optional(),
  /**
   * "1" = students of the CALLER'S OWN classes (the picker's "My Classes"
   * default for admins/super-admins who teach). Ignored when classId is set.
   */
  mine: z.enum(["0", "1"]).optional(),
})

/** Scoped student options for the shared staff filter bar (essays + learning). */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!parsed.success) return invalid(parsed.error)
    const opts = {
      classId: parsed.data.classId,
      mineTeacherId: parsed.data.mine === "1" ? staff.userId : undefined,
    }
    const users =
      parsed.data.all === "1"
        ? await listAllStaffStudents(staff.scope, opts)
        : await listStaffStudents(staff.scope, parsed.data)
    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error listing language-check staff students:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
