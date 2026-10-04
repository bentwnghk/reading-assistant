import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClasslessStudentSessions } from "@/lib/users"
import { getSpellingReviewSessionCountsForUsers } from "@/lib/vocabulary"

/**
 * GET /api/users/classless-sessions[?schoolId=...]
 *
 * Student Data rows for students who are in NO class (roster enumeration in
 * the "all classes" view can never reach them). Admins are scoped to their
 * own school; super-admins may pass ?schoolId= to narrow, otherwise they see
 * all schools.
 */
export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const schoolId =
      role === "super-admin" ? searchParams.get("schoolId") || null : null

    const sessions = await getClasslessStudentSessions(
      session.user.id,
      role,
      schoolId
    )
    const userIds = [...new Set(sessions.map((s) => s.userId))]
    const spellingReviewCounts = await getSpellingReviewSessionCountsForUsers(
      userIds
    )

    return NextResponse.json({ sessions, spellingReviewCounts })
  } catch (error) {
    console.error("Failed to get classless student sessions:", error)
    return NextResponse.json(
      { error: "Failed to get classless student sessions" },
      { status: 500 }
    )
  }
}
