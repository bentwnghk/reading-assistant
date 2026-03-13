import { auth } from "@/auth"
import { getPersonalStats, refreshWeeklyStatsForUser } from "@/lib/leaderboard"
import { getWeekStart } from "@/lib/activity"
import { getUserRole } from "@/lib/users"
import { NextResponse } from "next/server"

// GET /api/leaderboard/me?week=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const role   = await getUserRole(userId, session.user.email)

    // Teachers and admins are not learners — return a flag so the UI can
    // show an appropriate message instead of a stats card full of zeros.
    if (role === "teacher" || role === "admin") {
      return NextResponse.json({ isTeacher: true })
    }

    const { searchParams } = new URL(request.url)
    const weekParam = searchParams.get("week")
    const weekStart = weekParam ? new Date(weekParam) : getWeekStart()

    // Refresh the student's own weekly stats so data is always current
    await refreshWeeklyStatsForUser(userId, weekStart)

    const stats = await getPersonalStats(userId, weekStart)
    return NextResponse.json({ isTeacher: false, ...stats })
  } catch (error) {
    console.error("[leaderboard/me] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch personal stats" },
      { status: 500 }
    )
  }
}
