import { auth } from "@/auth"
import {
  getLeaderboard,
  refreshWeeklyStatsForUser,
  type LeaderboardScope,
  type SortColumn,
} from "@/lib/leaderboard"
import { getWeekStart } from "@/lib/activity"
import { getUserRole, getStudentClassId } from "@/lib/users"
import { NextResponse } from "next/server"

// GET /api/leaderboard?scope=class|school|global&classId=...&schoolId=...&week=YYYY-MM-DD&sortBy=...&limit=50
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scopeParam  = (searchParams.get("scope") ?? "class") as LeaderboardScope
    const classId     = searchParams.get("classId") ?? undefined
    const schoolId    = searchParams.get("schoolId") ?? undefined
    const weekParam   = searchParams.get("week")
    const sortByParam = (searchParams.get("sortBy") ?? "weekly_score") as SortColumn
    const limit       = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)

    const weekStart = weekParam ? new Date(weekParam) : getWeekStart()

    const userId   = session.user.id
    const userRole = await getUserRole(userId, session.user.email)

    // Always refresh the requesting user's own weekly stats so their latest
    // activity (quiz, test, spelling, flashcards) shows up immediately.
    await refreshWeeklyStatsForUser(userId, weekStart)

    // Students can only see their own class scope unless they explicitly
    // choose school or global scope. Teachers/admins can query any scope.
    let resolvedClassId  = classId
    const resolvedSchoolId = schoolId
    let resolvedScope    = scopeParam

    if (userRole === "student" && resolvedScope === "class" && !resolvedClassId) {
      // Auto-resolve the student's class
      resolvedClassId = (await getStudentClassId(userId)) ?? undefined
      if (!resolvedClassId) {
        // Student has no class — fall back to global
        resolvedScope = "global"
      }
    }

    const data = await getLeaderboard(userId, {
      scope:    resolvedScope,
      classId:  resolvedClassId,
      schoolId: resolvedSchoolId,
      weekStart,
      sortBy:   sortByParam,
      limit,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("[leaderboard] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    )
  }
}
