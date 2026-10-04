import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { canAccessClass, getRosterSessions } from "@/lib/users"
import { getSpellingReviewSessionCountsForUsers } from "@/lib/vocabulary"

/**
 * GET /api/users/roster-sessions?classId=all|<id>[&schoolId=...]
 *
 * Student Data rows for a whole class scope in ONE request — replaces the
 * former client-side fan-out (one members request per class plus one
 * sessions request per student). Teacher session-visibility applies inside
 * the query; "all" resolves the viewer's visible classes server-side
 * (admin: own school, teacher: own classes, super-admin: all or ?schoolId=).
 * "all" for admins/super-admins also merges classless students. Spelling
 * review counts are batched for every returned user.
 */
export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "super-admin" && role !== "admin" && role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get("classId")
  if (!classId) {
    return NextResponse.json({ error: "classId is required" }, { status: 400 })
  }

  // Single-class scopes keep the same access check as the per-student route.
  if (classId !== "all" && !(await canAccessClass(session.user.id, role, classId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const schoolId = role === "super-admin" ? searchParams.get("schoolId") : null
    const sessions = await getRosterSessions(
      { id: session.user.id, role },
      { classId, schoolId }
    )
    const userIds = [...new Set(sessions.map((s) => s.userId))]
    const spellingReviewCounts = await getSpellingReviewSessionCountsForUsers(userIds)

    return NextResponse.json({ sessions, spellingReviewCounts })
  } catch (error) {
    console.error("Failed to get roster sessions:", error)
    return NextResponse.json({ error: "Failed to get student sessions" }, { status: 500 })
  }
}
