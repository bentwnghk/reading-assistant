import { auth } from "@/auth"
import { getPersonalStats, refreshWeeklyStatsForUser } from "@/lib/leaderboard"
import { getWeekStart } from "@/lib/activity"
import { NextResponse } from "next/server"

// GET /api/leaderboard/me?week=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

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
