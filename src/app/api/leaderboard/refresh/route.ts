import { auth } from "@/auth"
import { getPool } from "@/lib/db"
import { refreshWeeklyStatsForUser } from "@/lib/leaderboard"
import { getWeekStart } from "@/lib/activity"
import { getUserRole } from "@/lib/users"
import { NextResponse } from "next/server"

/**
 * POST /api/leaderboard/refresh
 *
 * Refreshes weekly_stats for all users (teachers/admins) or for the requesting
 * user only (students). Can also be called by an external cron job with a
 * CRON_SECRET header for full-table refreshes.
 */
export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get("authorization")

    // Allow cron jobs to call this without a user session
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      await refreshAll()
      return NextResponse.json({ ok: true, refreshedBy: "cron" })
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = await getUserRole(session.user.id, session.user.email)

    if (role === "admin" || role === "teacher") {
      await refreshAll()
      return NextResponse.json({ ok: true, refreshedBy: "admin" })
    }

    // Students only refresh their own row
    await refreshWeeklyStatsForUser(session.user.id, getWeekStart())
    return NextResponse.json({ ok: true, refreshedBy: "self" })
  } catch (error) {
    console.error("[leaderboard/refresh] POST error:", error)
    return NextResponse.json(
      { error: "Failed to refresh leaderboard stats" },
      { status: 500 }
    )
  }
}

async function refreshAll() {
  const pool = getPool()
  const client = await pool.connect()
  try {
    const { rows } = await client.query(`SELECT id FROM users`)
    const weekStart = getWeekStart()
    // Refresh in batches of 10 to avoid overwhelming the DB
    const batchSize = 10
    for (let i = 0; i < rows.length; i += batchSize) {
      await Promise.all(
        rows.slice(i, i + batchSize).map(r =>
          refreshWeeklyStatsForUser(r.id, weekStart)
        )
      )
    }
  } finally {
    client.release()
  }
}
