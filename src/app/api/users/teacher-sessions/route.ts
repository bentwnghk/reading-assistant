import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { canAccessStudent, getTeacherRosterSessions } from "@/lib/users"
import { getSpellingReviewSessionCountsForUsers } from "@/lib/vocabulary"

/**
 * GET /api/users/teacher-sessions?teacherId=all|<id>[&schoolId=...]
 *
 * Teacher Data rows for a whole teacher scope in ONE request — replaces the
 * former client-side fan-out (one /api/users/[id]/sessions request per
 * teacher). Admin/super-admin only (the Teacher Data tab's audience); "all"
 * resolves the teacher roster server-side (admin: own school, super-admin:
 * all teachers or ?schoolId=). Spelling review counts are batched for every
 * returned user.
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

  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get("teacherId")
  if (!teacherId) {
    return NextResponse.json({ error: "teacherId is required" }, { status: 400 })
  }

  // Single-teacher scopes keep the same access check as the per-user route.
  if (teacherId !== "all" && !(await canAccessStudent(session.user.id, role, teacherId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const schoolId = role === "super-admin" ? searchParams.get("schoolId") : null
    const sessions = await getTeacherRosterSessions(
      { id: session.user.id, role },
      { teacherId, schoolId }
    )
    const userIds = [...new Set(sessions.map((s) => s.userId))]
    const spellingReviewCounts = await getSpellingReviewSessionCountsForUsers(userIds)

    return NextResponse.json({ sessions, spellingReviewCounts })
  } catch (error) {
    console.error("Failed to get teacher sessions:", error)
    return NextResponse.json({ error: "Failed to get teacher sessions" }, { status: 500 })
  }
}
