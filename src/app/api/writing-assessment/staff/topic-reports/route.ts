import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { parseError } from "@/utils/error"
import { requireStaff, invalid } from "@/lib/language-check-learn-http"
import { listTopicReportCards } from "@/lib/language-check-topic-report"
import { auth } from "@/auth"

const querySchema = z.object({
  classId: z.string().min(1).optional(),
  /** "1" = only topics of the CALLER'S OWN classes ("My Classes"). Ignored when classId is set. */
  mine: z.enum(["0", "1"]).optional(),
})

/** Topic cards for the staff "Topic reports" tab. */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff()
    if ("response" in staff) return staff.response
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    if (!parsed.success) return invalid(parsed.error)
    const session = await auth()
    const cards = await listTopicReportCards(
      staff.scope,
      { id: staff.userId, role: session?.user?.role ?? "teacher" },
      {
        classId: parsed.data.classId,
        mineTeacherId: parsed.data.mine === "1" && !parsed.data.classId ? staff.userId : undefined,
      },
    )
    return NextResponse.json({ topics: cards })
  } catch (error) {
    console.error("Error listing topic reports:", error)
    return NextResponse.json({ error: parseError(error) }, { status: 500 })
  }
}
