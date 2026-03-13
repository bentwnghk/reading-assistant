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

    const { searchParams } = new URL(request.url)
    const weekParam = searchParams.get("week")
    const weekStart = weekParam ? new Date(weekParam) : getWeekStart()

    // Always refresh current user's stats on this endpoint so data stays current
    await refreshWeeklyStatsForUser(session.user.id, weekStart)

    const stats = await getPersonalStats(session.user.id, weekStart)
    return NextResponse.json(stats)
  } catch (error) {
    console.error("[leaderboard/me] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch personal stats" },
      { status: 500 }
    )
  }
}
